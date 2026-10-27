import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, eq } from 'drizzle-orm'
import { errorResponse, noContent, savedKind, savedPeopleResponse, savedPlacesResponse } from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import { saves } from '../db/schema'
import { listingView, partsOf, visibleListings } from '../listings/read'
import { idParams } from '../params'
import { answersFor, cardView, visibleCards } from '../profiles/read'
import type { Storage } from '../storage'
import { savesOf } from './read'

const saveSchema = { params: idParams, response: { 204: noContent, 404: errorResponse } }
const unsaveParams = idParams.extend({ kind: savedKind })

/** The rows in the order of the ids: Saved shows the newest save first. */
const inOrder = <T extends { id: string }>(ids: string[], rows: T[]) => {
  const byId = new Map(rows.map((r) => [r.id, r]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}

export function savedRoutes(v1: FastifyInstance, options: AuthOptions & { storage: Storage }) {
  const { db, storage } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireUser(options)

  app.put('/saved/places/:id', { preHandler, schema: saveSchema }, async (req, reply) => {
    const [listing] = await visibleListings(db, req.user!.id, [req.params.id])
    if (!listing) return reply.code(404).send({ error: 'not found' })
    await db.insert(saves).values({ userId: req.user!.id, listingId: listing.id }).onConflictDoNothing()
    return reply.code(204).send(null)
  })

  app.put('/saved/people/:id', { preHandler, schema: saveSchema }, async (req, reply) => {
    const [person] = await visibleCards(db, req.user!.id, [req.params.id])
    if (!person) return reply.code(404).send({ error: 'not found' })
    await db.insert(saves).values({ userId: req.user!.id, profileId: person.id }).onConflictDoNothing()
    return reply.code(204).send(null)
  })

  app.delete('/saved/:kind/:id', { preHandler, schema: { params: unsaveParams, response: { 204: noContent } } }, async (req, reply) => {
    const target = { places: saves.listingId, people: saves.profileId }[req.params.kind]
    await db.delete(saves).where(and(eq(saves.userId, req.user!.id), eq(target, req.params.id)))
    return reply.code(204).send(null)
  })

  app.get('/saved/places', { preHandler, schema: { response: { 200: savedPlacesResponse } } }, async (req) => {
    const ids = (await savesOf(db, req.user!.id)).flatMap((s) => (s.listingId ? [s.listingId] : []))
    const listings = inOrder(ids, await visibleListings(db, req.user!.id, ids))
    const parts = await partsOf(db, listings.map((l) => l.id))
    return { places: listings.map((l) => listingView(l, parts(l.id), storage, false)) }
  })

  app.get('/saved/people', { preHandler, schema: { response: { 200: savedPeopleResponse } } }, async (req) => {
    const ids = (await savesOf(db, req.user!.id)).flatMap((s) => (s.profileId ? [s.profileId] : []))
    const people = inOrder(ids, await visibleCards(db, req.user!.id, ids))
    const answers = await answersFor(db, people.map((p) => p.id))
    return { people: people.map((p) => cardView(p, answers(p.id), storage)) }
  })
}
