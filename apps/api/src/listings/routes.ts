import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, desc, eq } from 'drizzle-orm'
import {
  createListingBody, errorResponse, incompleteListingResponse, listingEditBody, listingEdits, listingResponse,
  listingStatusBody, myListingsResponse, noContent, uploadUrlBody, uploadUrlResponse,
  type GoLiveField, type ListingEdit,
} from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import type { Db } from '../db/client'
import { areas, listingFlatmates, listingRates, listings } from '../db/schema'
import { deletePhotos, photoUploadLink, type Storage } from '../storage'
import { maskContacts, maskFields } from '../text/mask-contacts'
import { isVisible, listingView, partsOf, type Flatmate, type Listing, type Parts, type Rate } from './read'
import { idParams } from '../params'

type ListingStatus = Listing['status']

const liveDays = 30
/** Each free-text field that the lister writes (PD17). */
const maskedFields = ['pgName', 'address', 'building', 'street', 'landmark', 'nearestStation', 'description'] as const
const allowedFrom: Record<'inactive' | 'filled', ListingStatus[]> = { inactive: ['live'], filled: ['live', 'inactive'] }

export function listingRoutes(v1: FastifyInstance, options: AuthOptions & { storage: Storage }) {
  const { db, storage } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireUser(options)

  app.post('/listings', {
    preHandler,
    schema: { body: createListingBody, response: { 201: listingResponse } },
  }, async (req, reply) => {
    const [listing] = await db.insert(listings).values({ ownerUserId: req.user!.id, kind: req.body.kind }).returning()
    return reply.code(201).send(listingView(listing!, (await partsOf(db, [listing!.id]))(listing!.id), storage, true))
  })

  app.get('/listings/mine', { preHandler, schema: { response: { 200: myListingsResponse } } }, async (req) => {
    const mine = await db.select().from(listings).where(eq(listings.ownerUserId, req.user!.id)).orderBy(desc(listings.createdAt))
    const parts = await partsOf(db, mine.map((l) => l.id))
    return { listings: mine.map((l) => listingView(l, parts(l.id), storage, true)) }
  })

  app.get('/listings/:id', {
    preHandler,
    schema: { params: idParams, response: { 200: listingResponse, 404: errorResponse } },
  }, async (req, reply) => {
    const [listing] = await db.select().from(listings).where(eq(listings.id, req.params.id))
    const isOwner = listing?.ownerUserId === req.user!.id
    if (!listing || (!isOwner && !isVisible(listing))) return reply.code(404).send({ error: 'not found' })
    return listingView(listing, (await partsOf(db, [listing.id]))(listing.id), storage, isOwner)
  })

  app.patch('/listings/:id', {
    preHandler,
    schema: {
      params: idParams,
      body: listingEditBody,
      response: { 200: listingResponse, 400: errorResponse, 404: errorResponse, 422: incompleteListingResponse, 502: errorResponse },
    },
  }, async (req, reply) => {
    const listing = await ownedListing(db, req.params.id, req.user!.id)
    if (!listing) return reply.code(404).send({ error: 'not found' })
    const parsed = listingEdits[listing.kind].safeParse(req.body)
    if (!parsed.success) {
      const fields = new Set(parsed.error.issues.flatMap((i) => (i.code === 'unrecognized_keys' ? i.keys : [String(i.path[0])])))
      return reply.code(400).send({ error: `not valid: ${[...fields].join(', ')}` })
    }
    const edit: ListingEdit = mask(parsed.data)
    const { rates: newRates, flatmates: newFlatmates, ...columns } = edit

    const newKeys = [...(edit.photoKeys ?? []), ...photoKeysOf(newFlatmates ?? [])]
    if (newKeys.some((key) => !key.startsWith(`listings/${listing.id}/`))) return reply.code(400).send({ error: 'a photo of a different listing' })
    if (edit.areaSlug && !(await db.select().from(areas).where(eq(areas.slug, edit.areaSlug))).length) {
      return reply.code(400).send({ error: 'unknown area' })
    }

    const current = (await partsOf(db, [listing.id]))(listing.id)
    const nextListing = { ...listing, ...columns }
    const hasType = (r: { sharing?: Rate['sharing'] }) => listing.kind !== 'pg' || nextListing.sharing.includes(r.sharing!)
    if (newRates && !newRates.every(hasType)) return reply.code(400).send({ error: 'not valid: rates' })
    const next = {
      lister: current.lister,
      listing: nextListing,
      // A PG that drops a sharing type drops its rent too.
      rates: newRates?.map((r) => ({ sharing: r.sharing ?? null, rent: r.rent, deposit: r.deposit })) ?? current.rates.filter(hasType),
      flatmates: newFlatmates ?? current.flatmates,
    }
    const ratesChanged = newRates !== undefined || next.rates.length !== current.rates.length
    // The database checks each status after draft, so the API gives 422 for it, not 500.
    if (listing.status !== 'draft') {
      const missing = missingToGoLive(next.listing, next, 'edit')
      if (missing.length) return reply.code(422).send({ error: 'incomplete', missing })
    }

    const kept = new Set([...next.listing.photoKeys, ...photoKeysOf(next.flatmates)])
    const removed = [...listing.photoKeys, ...photoKeysOf(current.flatmates)].filter((key) => !kept.has(key))
    if (!(await deletePhotos(storage, removed, req.log))) return reply.code(502).send({ error: 'photo storage failed' })

    const saved = await db.transaction(async (tx) => {
      const [row] = await tx.update(listings).set({ ...columns, updatedAt: new Date() })
        .where(listingOfOwner(listing.id, req.user!.id)).returning()
      if (!row) return undefined
      if (ratesChanged) {
        await tx.delete(listingRates).where(eq(listingRates.listingId, row.id))
        if (next.rates.length) await tx.insert(listingRates).values(next.rates.map((r) => ({ ...r, listingId: row.id, listingKind: row.kind })))
      }
      if (newFlatmates) {
        await tx.delete(listingFlatmates).where(eq(listingFlatmates.listingId, row.id))
        if (next.flatmates.length) {
          await tx.insert(listingFlatmates).values(next.flatmates.map((f, position) => ({ ...f, position, listingId: row.id, listingKind: row.kind })))
        }
      }
      return row
    })
    if (!saved) return reply.code(404).send({ error: 'not found' })
    return listingView(saved, next, storage, true)
  })

  app.post('/listings/:id/status', {
    preHandler,
    schema: {
      params: idParams,
      body: listingStatusBody,
      response: { 200: listingResponse, 404: errorResponse, 409: errorResponse, 422: incompleteListingResponse },
    },
  }, async (req, reply) => {
    const listing = await ownedListing(db, req.params.id, req.user!.id)
    if (!listing) return reply.code(404).send({ error: 'not found' })
    const { status } = req.body
    const parts = (await partsOf(db, [listing.id]))(listing.id)
    let expiresAt = listing.expiresAt
    if (status === 'live') {
      const missing = missingToGoLive(listing, parts, 'publish')
      if (missing.length) return reply.code(422).send({ error: 'incomplete', missing })
      expiresAt = new Date(Date.now() + liveDays * 86_400_000)
    } else if (!allowedFrom[status].includes(listing.status)) {
      return reply.code(409).send({ error: `a ${listing.status} listing cannot become ${status}` })
    }
    const [saved] = await db.update(listings).set({ status, expiresAt, updatedAt: new Date() })
      .where(listingOfOwner(listing.id, req.user!.id)).returning()
    if (!saved) return reply.code(404).send({ error: 'not found' })
    return listingView(saved, parts, storage, true)
  })

  app.delete('/listings/:id', {
    preHandler,
    schema: { params: idParams, response: { 204: noContent, 404: errorResponse, 502: errorResponse } },
  }, async (req, reply) => {
    const listing = await ownedListing(db, req.params.id, req.user!.id)
    if (!listing) return reply.code(404).send({ error: 'not found' })
    const { flatmates } = (await partsOf(db, [listing.id]))(listing.id)
    if (!(await deletePhotos(storage, [...listing.photoKeys, ...photoKeysOf(flatmates)], req.log))) {
      return reply.code(502).send({ error: 'photo storage failed' })
    }
    await db.delete(listings).where(listingOfOwner(listing.id, req.user!.id))
    return reply.code(204).send(null)
  })

  app.post('/listings/:id/upload-urls', {
    preHandler,
    schema: { params: idParams, body: uploadUrlBody, response: { 200: uploadUrlResponse, 404: errorResponse } },
  }, async (req, reply) => {
    const listing = await ownedListing(db, req.params.id, req.user!.id)
    if (!listing) return reply.code(404).send({ error: 'not found' })
    return photoUploadLink(storage, 'listings', listing.id, req.body)
  })
}

/** The owner guard of each read and write of a listing: the owner comes from the verified token (ADR-0015). */
const listingOfOwner = (listingId: string, ownerUserId: string) => and(eq(listings.id, listingId), eq(listings.ownerUserId, ownerUserId))

async function ownedListing(db: Db, id: string, ownerUserId: string) {
  const [listing] = await db.select().from(listings).where(listingOfOwner(id, ownerUserId))
  return listing
}

function mask(edit: ListingEdit): ListingEdit {
  const masked = maskFields(edit, maskedFields)
  if (edit.flatmates) {
    masked.flatmates = edit.flatmates.map((f) => ({ ...f, name: maskContacts(f.name), whatTheyDo: f.whatTheyDo && maskContacts(f.whatTheyDo) }))
  }
  return masked
}

const photoKeysOf = (flatmates: Pick<Flatmate, 'photoKey'>[]) => flatmates.flatMap((f) => (f.photoKey ? [f.photoKey] : []))

/**
 * A PG publishes with a rent for each sharing type. An edit of a PG that has been live needs one rent only,
 * so step 4 can add a sharing type before step 5 gives its rent.
 */
function missingToGoLive(listing: Listing, { rates, flatmates }: Parts, check: 'publish' | 'edit') {
  const missing: GoLiveField[] = []
  if (!listing.areaSlug) missing.push('areaSlug')
  if (listing.kind === 'pg' && !listing.pgName) missing.push('pgName')
  if (listing.kind === 'broker_flat' && listing.brokerage === null) missing.push('brokerage')
  const priced = new Set(rates.map((r) => r.sharing))
  const pgPriced = check === 'publish' ? listing.sharing.every((s) => priced.has(s)) : rates.length > 0
  const unpriced = listing.kind === 'pg' ? !listing.sharing.length || !pgPriced : !rates.length
  if (unpriced) missing.push('rates')
  if (flatmates.length && !listing.flatmatesConsent) missing.push('flatmatesConsent')
  return missing
}

