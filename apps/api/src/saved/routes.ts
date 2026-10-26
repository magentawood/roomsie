import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { errorResponse, savedPeopleResponse, savedPlacesResponse } from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import { listings, profiles, saves, users } from '../db/schema'
import { idParams } from '../listings/routes'
import { listingView, partsOf, visibleListing } from '../listings/view'
import { visiblePeople } from '../match/query'
import type { Storage } from '../storage'

const saveSchema = { params: idParams, response: { 204: z.null(), 404: errorResponse } }
const unsaveParams = idParams.extend({ kind: z.enum(['places', 'people']) })

/** A save of the same item again changes nothing, and so does an unsave (T-47). */
export function savedRoutes(v1: FastifyInstance, options: AuthOptions & { storage: Storage }) {
  const { db, storage } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireUser(options)

  app.put('/saved/places/:id', { preHandler, schema: saveSchema }, async (req, reply) => {
    const [listing] = await db.select({ id: listings.id }).from(listings).where(and(eq(listings.id, req.params.id), visibleListing()))
    if (!listing) return reply.code(404).send({ error: 'not found' })
    await db.insert(saves).values({ userId: req.user!.id, listingId: listing.id }).onConflictDoNothing()
    return reply.code(204).send(null)
  })

  app.put('/saved/people/:id', { preHandler, schema: saveSchema }, async (req, reply) => {
    const [person] = await db.select({ id: profiles.id }).from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(and(eq(profiles.id, req.params.id), ...visiblePeople(req.user!.id)))
    if (!person) return reply.code(404).send({ error: 'not found' })
    await db.insert(saves).values({ userId: req.user!.id, profileId: person.id }).onConflictDoNothing()
    return reply.code(204).send(null)
  })

  app.delete('/saved/:kind/:id', { preHandler, schema: { params: unsaveParams, response: { 204: z.null() } } }, async (req, reply) => {
    const target = { places: saves.listingId, people: saves.profileId }[req.params.kind]
    await db.delete(saves).where(and(eq(saves.userId, req.user!.id), eq(target, req.params.id)))
    return reply.code(204).send(null)
  })

  app.get('/saved/places', { preHandler, schema: { response: { 200: savedPlacesResponse } } }, async (req) => {
    const rows = await db.select({ listing: listings }).from(saves)
      .innerJoin(listings, eq(saves.listingId, listings.id))
      .where(and(eq(saves.userId, req.user!.id), visibleListing()))
      .orderBy(desc(saves.createdAt))
    const parts = await partsOf(db, rows.map((r) => r.listing.id))
    return { places: rows.map((r) => listingView(r.listing, parts(r.listing.id), storage, false)) }
  })

  app.get('/saved/people', { preHandler, schema: { response: { 200: savedPeopleResponse } } }, async (req) => {
    const rows = await db.select({ profileId: profiles.id }).from(saves)
      .innerJoin(profiles, eq(saves.profileId, profiles.id))
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(and(eq(saves.userId, req.user!.id), ...visiblePeople(req.user!.id)))
      .orderBy(desc(saves.createdAt))
    return { people: rows.map((r) => r.profileId) }
  })
}
