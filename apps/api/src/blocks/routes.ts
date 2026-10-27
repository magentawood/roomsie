import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { blockBody, errorResponse, noContent } from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import { blocks } from '../db/schema'
import { ownerOfProfile } from '../profiles/read'
import { declineOpenBetween } from '../requests/read'

export function blockRoutes(v1: FastifyInstance, options: AuthOptions) {
  const { db } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()

  app.post('/blocks', {
    preHandler: requireUser(options),
    schema: { body: blockBody, response: { 204: noContent, 404: errorResponse } },
  }, async (req, reply) => {
    const blockerUserId = req.user!.id
    // Each state of the card, so that the recipient of a request can block its sender.
    const [blocked] = await ownerOfProfile(db, req.body.profileId, blockerUserId)
    if (!blocked) return reply.code(404).send({ error: 'not found' })
    await db.transaction(async (tx) => {
      // ADR-0015: a retried tap, or a second block of the same person, adds nothing.
      await tx.insert(blocks).values({ id: req.body.id, blockerUserId, blockedUserId: blocked.userId }).onConflictDoNothing()
      await declineOpenBetween(tx, blockerUserId, blocked.userId)
    })
    return reply.code(204).send(null)
  })
}
