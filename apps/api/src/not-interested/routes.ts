import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, eq, ne, or } from 'drizzle-orm'
import { errorResponse, noContent, notInterestedBody, type NotInterestedBody } from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'
import { requireUser, type AuthOptions } from '../auth'
import type { Db } from '../db/client'
import { connectionRequests, listings, notInterested } from '../db/schema'
import type { Messaging } from '../messages/settings'
import { ownerOfProfile } from '../profiles/read'
import { betweenUsers, declineOpenBetween, openRequest } from '../requests/read'

/**
 * The other person. A card in each state, so that the recipient of a request can pick it. A listing names its lister, in
 * each state of the listing, but only when a chat or an open request joins the two people.
 */
async function otherOf(db: Db, userId: string, body: NotInterestedBody) {
  if ('profileId' in body) return (await ownerOfProfile(db, body.profileId, userId))[0]?.userId
  const [owner] = await db.select({ userId: listings.ownerUserId }).from(listings)
    .where(and(eq(listings.id, body.listingId), ne(listings.ownerUserId, userId)))
  if (!owner) return undefined
  const [joined] = await db.select({ id: connectionRequests.id }).from(connectionRequests)
    .where(and(betweenUsers(userId, owner.userId), or(eq(connectionRequests.status, 'accepted'), openRequest()))).limit(1)
  return joined && owner.userId
}

/** "Not interested" of the report modal (PD17). It files no report. */
export function notInterestedRoutes(v1: FastifyInstance, options: AuthOptions & { messaging: Messaging }) {
  const { db, messaging } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()

  app.post('/not-interested', {
    preHandler: requireUser(options),
    schema: { body: notInterestedBody, response: { 204: noContent, 404: errorResponse } },
  }, async (req, reply) => {
    const userId = req.user!.id
    const otherUserId = await otherOf(db, userId, req.body)
    if (!otherUserId) return reply.code(404).send({ error: 'not found' })
    await db.transaction(async (tx) => {
      // ADR-0015: a retried tap, or a second pick of the same person, adds nothing.
      await tx.insert(notInterested).values({ id: req.body.id, userId, otherUserId }).onConflictDoNothing()
      // The chat stays in the database for the reports. The queries of Messages leave it out.
      await declineOpenBetween(tx, userId, otherUserId)
    })
    // Realtime is best effort: an open Messages page of each person gets the lists again.
    await Promise.all([userId, otherUserId].map((to) => messaging.realtime.send(to, { event: 'removed', payload: {} })
      .catch((err: unknown) => reportError(err, { where: 'realtime', userId, log: req.log }))))
    return reply.code(204).send(null)
  })
}
