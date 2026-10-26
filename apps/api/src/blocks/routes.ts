import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, eq, ne } from 'drizzle-orm'
import { blockBody, errorResponse, noContent } from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import { blocks, connectionRequests, profiles } from '../db/schema'
import { betweenUsers } from '../requests/read'

export function blockRoutes(v1: FastifyInstance, options: AuthOptions) {
  const { db } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()

  app.post('/blocks', {
    preHandler: requireUser(options),
    schema: { body: blockBody, response: { 204: noContent, 404: errorResponse } },
  }, async (req, reply) => {
    const blockerUserId = req.user!.id
    // Each state of the card, so that the recipient of a request can block its sender.
    const [blocked] = await db.select({ userId: profiles.userId }).from(profiles)
      .where(and(eq(profiles.id, req.body.profileId), ne(profiles.userId, blockerUserId)))
    if (!blocked) return reply.code(404).send({ error: 'not found' })
    await db.transaction(async (tx) => {
      // ADR-0015: a retried tap, or a second block of the same person, adds nothing.
      await tx.insert(blocks).values({ id: req.body.id, blockerUserId, blockedUserId: blocked.userId }).onConflictDoNothing()
      // The sender of an open request sees "not available", as after a decline, so the block does not show.
      await tx.update(connectionRequests).set({ status: 'declined', respondedAt: new Date() })
        .where(and(betweenUsers(blockerUserId, blocked.userId), eq(connectionRequests.status, 'pending')))
    })
    return reply.code(204).send(null)
  })
}
