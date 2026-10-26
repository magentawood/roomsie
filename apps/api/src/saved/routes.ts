import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, desc, eq, gt, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { errorResponse, savedPeopleResponse, savedPlacesResponse } from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import { blocks, listings, profiles, saves, users } from '../db/schema'
import { partsOf, view } from '../listings/routes'
import type { Storage } from '../storage'

const idParams = z.object({ id: z.uuid() })
const saveSchema = { params: idParams, response: { 204: z.null(), 404: errorResponse } }

/** A listing that other users can see: live, and not expired (T-41). */
const liveListing = () => and(eq(listings.status, 'live'), gt(listings.expiresAt, new Date()))

/** A person that the user can see: a live card of an active account, not the user, and no block either way. */
const visiblePerson = (userId: string) => and(
  eq(profiles.visibility, 'live'),
  eq(users.status, 'active'),
  ne(profiles.userId, userId),
  sql`not exists (select 1 from ${blocks} where (${blocks.blockerUserId} = ${userId} and ${blocks.blockedUserId} = ${profiles.userId})
    or (${blocks.blockerUserId} = ${profiles.userId} and ${blocks.blockedUserId} = ${userId}))`,
)

/** Saved places and people (T-47). A save of the same item again changes nothing, and so does an unsave. */
export function savedRoutes(v1: FastifyInstance, options: AuthOptions & { storage: Storage }) {
  const { db, storage } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireUser(options)

  app.put('/saved/places/:id', { preHandler, schema: saveSchema }, async (req, reply) => {
    const [listing] = await db.select({ id: listings.id }).from(listings).where(and(eq(listings.id, req.params.id), liveListing()))
    if (!listing) return reply.code(404).send({ error: 'not found' })
    await db.insert(saves).values({ userId: req.user!.id, listingId: listing.id }).onConflictDoNothing()
    return reply.code(204).send(null)
  })

  app.delete('/saved/places/:id', { preHandler, schema: saveSchema }, async (req, reply) => {
    await db.delete(saves).where(and(eq(saves.userId, req.user!.id), eq(saves.listingId, req.params.id)))
    return reply.code(204).send(null)
  })

  app.get('/saved/places', { preHandler, schema: { response: { 200: savedPlacesResponse } } }, async (req) => {
    const rows = await db.select({ savedAt: saves.createdAt, listing: listings }).from(saves)
      .innerJoin(listings, eq(saves.listingId, listings.id))
      .where(and(eq(saves.userId, req.user!.id), liveListing()))
      .orderBy(desc(saves.createdAt))
    const parts = await partsOf(db, rows.map((r) => r.listing.id))
    return { places: rows.map((r) => ({ savedAt: r.savedAt.toISOString(), listing: view(r.listing, parts(r.listing.id), storage, false) })) }
  })

  app.put('/saved/people/:id', { preHandler, schema: saveSchema }, async (req, reply) => {
    const [person] = await db.select({ id: profiles.id }).from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(and(eq(profiles.id, req.params.id), visiblePerson(req.user!.id)))
    if (!person) return reply.code(404).send({ error: 'not found' })
    await db.insert(saves).values({ userId: req.user!.id, profileId: person.id }).onConflictDoNothing()
    return reply.code(204).send(null)
  })

  app.delete('/saved/people/:id', { preHandler, schema: saveSchema }, async (req, reply) => {
    await db.delete(saves).where(and(eq(saves.userId, req.user!.id), eq(saves.profileId, req.params.id)))
    return reply.code(204).send(null)
  })

  app.get('/saved/people', { preHandler, schema: { response: { 200: savedPeopleResponse } } }, async (req) => {
    const rows = await db.select({ savedAt: saves.createdAt, profileId: profiles.id }).from(saves)
      .innerJoin(profiles, eq(saves.profileId, profiles.id))
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(and(eq(saves.userId, req.user!.id), visiblePerson(req.user!.id)))
      .orderBy(desc(saves.createdAt))
    return { people: rows.map((r) => ({ savedAt: r.savedAt.toISOString(), profileId: r.profileId })) }
  })
}
