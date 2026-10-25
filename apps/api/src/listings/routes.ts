import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import {
  createListingBody, incompleteListingResponse, listingEditBody, listingEdits, listingResponse, listingStatusBody,
  myListingsResponse, sharingTypes, uploadUrlBody, uploadUrlResponse, type ListingEdit, type ListingResponse,
} from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import type { Db } from '../db/client'
import { areas, listingFlatmates, listingRates, listings } from '../db/schema'
import type { Storage } from '../storage'
import { maskContacts } from '../text/mask-contacts'

type Listing = typeof listings.$inferSelect
type Rate = Pick<typeof listingRates.$inferSelect, 'sharing' | 'rent' | 'deposit'>
type Flatmate = Omit<typeof listingFlatmates.$inferInsert, 'listingId' | 'listingKind'>

const liveDays = 30
/** Each free-text field that the lister writes (PD17). */
const maskedFields = ['pgName', 'address', 'building', 'street', 'landmark', 'nearestStation', 'description'] as const
const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const
const idParams = z.object({ id: z.uuid() })
const error = z.object({ error: z.string() })

export function listingRoutes(v1: FastifyInstance, options: AuthOptions & { storage: Storage }) {
  const { db, storage } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireUser(options)

  app.post('/listings', {
    preHandler,
    schema: { body: createListingBody, response: { 201: listingResponse } },
  }, async (req, reply) => {
    const [listing] = await db.insert(listings).values({ ownerUserId: req.user!.id, kind: req.body.kind }).returning()
    return reply.code(201).send(view(listing!, [], [], storage, true))
  })

  app.get('/listings/mine', { preHandler, schema: { response: { 200: myListingsResponse } } }, async (req) => {
    const mine = await db.select().from(listings).where(eq(listings.ownerUserId, req.user!.id)).orderBy(desc(listings.createdAt))
    const parts = await partsOf(db, mine.map((l) => l.id))
    return { listings: mine.map((l) => view(l, parts.rates(l.id), parts.flatmates(l.id), storage, true)) }
  })

  app.get('/listings/:id', {
    preHandler,
    schema: { params: idParams, response: { 200: listingResponse, 404: error } },
  }, async (req, reply) => {
    const [listing] = await db.select().from(listings).where(eq(listings.id, req.params.id))
    const isOwner = listing?.ownerUserId === req.user!.id
    const visible = listing?.status === 'live' && listing.expiresAt! > new Date()
    if (!listing || (!isOwner && !visible)) return reply.code(404).send({ error: 'not found' })
    const parts = await partsOf(db, [listing.id])
    return view(listing, parts.rates(listing.id), parts.flatmates(listing.id), storage, isOwner)
  })

  app.patch('/listings/:id', {
    preHandler,
    schema: { params: idParams, body: listingEditBody, response: { 200: listingResponse, 400: error, 404: error, 422: incompleteListingResponse, 502: error } },
  }, async (req, reply) => {
    const listing = await ownedListing(db, req.params.id, req.user!.id)
    if (!listing) return reply.code(404).send({ error: 'not found' })
    const parsed = listingEdits[listing.kind].safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: `not a field of a ${listing.kind} listing` })
    const edit: ListingEdit = mask(parsed.data)
    const { rates: newRates, flatmates: newFlatmates, ...columns } = edit

    const newKeys = [...(edit.photoKeys ?? []), ...photoKeysOf(newFlatmates ?? [])]
    if (newKeys.some((key) => !isKeyOf(listing.id, key))) return reply.code(400).send({ error: 'a photo of a different listing' })
    if (edit.areaSlug && !(await db.select().from(areas).where(eq(areas.slug, edit.areaSlug))).length) {
      return reply.code(400).send({ error: 'unknown area' })
    }

    const parts = await partsOf(db, [listing.id])
    const rates = newRates?.map((r) => ({ sharing: r.sharing ?? null, rent: r.rent, deposit: r.deposit })) ?? parts.rates(listing.id)
    const flatmates = newFlatmates ?? parts.flatmates(listing.id)
    const next = { ...listing, ...columns }
    if (listing.status !== 'draft') {
      const missing = missingToGoLive(next, rates, flatmates)
      if (missing.length) return reply.code(422).send({ error: 'incomplete', missing })
    }

    const kept = new Set(photoKeysOf(flatmates).concat(next.photoKeys))
    const removed = [...listing.photoKeys, ...photoKeysOf(parts.flatmates(listing.id))].filter((key) => !kept.has(key))
    if (!(await deleted(storage, removed, req.log))) return reply.code(502).send({ error: 'photo storage failed' })

    const [saved] = await db.transaction(async (tx) => {
      if (newRates) {
        await tx.delete(listingRates).where(eq(listingRates.listingId, listing.id))
        if (rates.length) await tx.insert(listingRates).values(rates.map((r) => ({ ...r, listingId: listing.id, listingKind: listing.kind })))
      }
      if (newFlatmates) {
        await tx.delete(listingFlatmates).where(eq(listingFlatmates.listingId, listing.id))
        // One millisecond apart, so created_at keeps the order of the lister.
        const now = Date.now()
        if (flatmates.length) {
          await tx.insert(listingFlatmates).values(flatmates.map((f, i) => ({
            ...f, listingId: listing.id, listingKind: listing.kind, createdAt: new Date(now + i),
          })))
        }
      }
      return tx.update(listings).set({ ...columns, updatedAt: new Date() })
        .where(and(eq(listings.id, listing.id), eq(listings.ownerUserId, req.user!.id))).returning()
    })
    return view(saved!, rates, flatmates, storage, true)
  })

  app.post('/listings/:id/status', {
    preHandler,
    schema: { params: idParams, body: listingStatusBody, response: { 200: listingResponse, 404: error, 409: error, 422: incompleteListingResponse } },
  }, async (req, reply) => {
    const listing = await ownedListing(db, req.params.id, req.user!.id)
    if (!listing) return reply.code(404).send({ error: 'not found' })
    const { status } = req.body
    const parts = await partsOf(db, [listing.id])
    let expiresAt = listing.expiresAt
    if (status === 'live') {
      const missing = missingToGoLive(listing, parts.rates(listing.id), parts.flatmates(listing.id))
      if (missing.length) return reply.code(422).send({ error: 'incomplete', missing })
      expiresAt = new Date(Date.now() + liveDays * 86_400_000)
    } else if (status === 'inactive' ? listing.status !== 'live' : !['live', 'inactive'].includes(listing.status)) {
      return reply.code(409).send({ error: `a ${listing.status} listing cannot become ${status}` })
    }
    const [saved] = await db.update(listings).set({ status, expiresAt, updatedAt: new Date() })
      .where(and(eq(listings.id, listing.id), eq(listings.ownerUserId, req.user!.id))).returning()
    return view(saved!, parts.rates(listing.id), parts.flatmates(listing.id), storage, true)
  })

  app.delete('/listings/:id', {
    preHandler,
    schema: { params: idParams, response: { 204: z.null(), 404: error, 502: error } },
  }, async (req, reply) => {
    const listing = await ownedListing(db, req.params.id, req.user!.id)
    if (!listing) return reply.code(404).send({ error: 'not found' })
    const parts = await partsOf(db, [listing.id])
    const keys = [...listing.photoKeys, ...photoKeysOf(parts.flatmates(listing.id))]
    if (!(await deleted(storage, keys, req.log))) return reply.code(502).send({ error: 'photo storage failed' })
    await db.delete(listings).where(and(eq(listings.id, listing.id), eq(listings.ownerUserId, req.user!.id)))
    return reply.code(204).send(null)
  })

  app.post('/listings/:id/upload-urls', {
    preHandler,
    schema: { params: idParams, body: uploadUrlBody, response: { 200: uploadUrlResponse, 404: error } },
  }, async (req, reply) => {
    const listing = await ownedListing(db, req.params.id, req.user!.id)
    if (!listing) return reply.code(404).send({ error: 'not found' })
    const { contentType, size } = req.body
    const key = `listings/${listing.id}/${uuidv7()}.${extensions[contentType]}`
    const { url, expiresAt } = await storage.uploadUrl(key, contentType, size)
    return { key, url, expiresAt: expiresAt.toISOString(), headers: { 'content-type': contentType, 'content-length': String(size) } }
  })
}

async function ownedListing(db: Db, id: string, ownerUserId: string) {
  const [listing] = await db.select().from(listings).where(and(eq(listings.id, id), eq(listings.ownerUserId, ownerUserId)))
  return listing
}

async function partsOf(db: Db, ids: string[]) {
  const rates = ids.length ? await db.select().from(listingRates).where(inArray(listingRates.listingId, ids)) : []
  const flatmates = ids.length
    ? await db.select().from(listingFlatmates).where(inArray(listingFlatmates.listingId, ids)).orderBy(asc(listingFlatmates.createdAt))
    : []
  return {
    rates: (id: string): Rate[] => rates.filter((r) => r.listingId === id),
    flatmates: (id: string): Flatmate[] => flatmates.filter((f) => f.listingId === id),
  }
}

function mask(edit: ListingEdit): ListingEdit {
  const masked = { ...edit }
  for (const field of maskedFields) {
    const value = edit[field]
    if (value) masked[field] = maskContacts(value)
  }
  masked.flatmates = edit.flatmates?.map((f) => ({ ...f, name: maskContacts(f.name), whatTheyDo: f.whatTheyDo && maskContacts(f.whatTheyDo) }))
  if (!edit.flatmates) delete masked.flatmates
  return masked
}

const photoKeysOf = (flatmates: Flatmate[]) => flatmates.flatMap((f) => (f.photoKey ? [f.photoKey] : []))
const isKeyOf = (listingId: string, key: string) => new RegExp(`^listings/${listingId}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(key)

/** False when R2 fails. Then the caller changes nothing (PD19). */
async function deleted(storage: Storage, keys: string[], log: { error: (obj: unknown) => void }) {
  if (!keys.length) return true
  return storage.deleteObjects(keys).then(() => true, (err: unknown) => {
    log.error(err)
    return false
  })
}

/** What a listing lacks to go live (T-41 spec). */
function missingToGoLive(listing: Listing, rates: Rate[], flatmates: Flatmate[]) {
  const missing: string[] = []
  if (!listing.areaSlug) missing.push('areaSlug')
  if (listing.kind === 'pg' && !listing.pgName) missing.push('pgName')
  if (listing.kind === 'broker_flat' && listing.brokerage === null) missing.push('brokerage')
  const priced = new Set(rates.map((r) => r.sharing))
  const unpriced = listing.kind === 'pg' ? !listing.sharing.length || listing.sharing.some((s) => !priced.has(s)) : !rates.length
  if (unpriced) missing.push('rates')
  if (flatmates.length && !listing.flatmatesConsent) missing.push('flatmatesConsent')
  return missing
}

function view(listing: Listing, rates: Rate[], flatmates: Flatmate[], storage: Storage, isOwner: boolean): ListingResponse {
  // The serializer parses each reply with the contract schema, which drops ownerUserId.
  const { photoKeys, roomType, address, expiresAt, createdAt, updatedAt, ...fields } = listing
  const sharingOrder = (r: Rate) => (r.sharing ? sharingTypes.indexOf(r.sharing) : -1)
  return {
    ...fields,
    roomType: roomType === 'unclear' ? null : roomType,
    address: isOwner || listing.shareAddress ? address : null,
    photos: photoKeys.map((key) => ({ key, url: storage.publicUrl(key) })),
    rates: [...rates].sort((a, b) => sharingOrder(a) - sharingOrder(b)).map(({ sharing, rent, deposit }) => ({ sharing, rent, deposit })),
    flatmates: flatmates.map((f) => ({
      name: f.name,
      age: f.age ?? null,
      whatTheyDo: f.whatTheyDo ?? null,
      food: f.food ?? null,
      photoKey: f.photoKey ?? null,
      photoUrl: f.photoKey ? storage.publicUrl(f.photoKey) : null,
    })),
    expiresAt: expiresAt?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  }
}
