import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { desc, eq } from 'drizzle-orm'
import { adminInvitesResponse, errorResponse, inviteBody, inviteGateBody, noContent } from '@roomsie/contract'
import { requireModerator, type AuthOptions } from '../auth'
import { inviteGate, invites } from '../db/schema'

/** The invites and the gate, which moderators change until the launch (T-33). */
export function inviteRoutes(v1: FastifyInstance, options: AuthOptions) {
  const { db } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireModerator(options)
  const schema = { 204: noContent, 404: errorResponse }

  app.get('/admin/invites', { preHandler, schema: { response: { 200: adminInvitesResponse, 404: errorResponse } } }, async () => {
    const [[gate], rows] = await Promise.all([
      db.select().from(inviteGate),
      db.select().from(invites).orderBy(desc(invites.createdAt), desc(invites.email)),
    ])
    return {
      inviteOnly: gate?.inviteOnly ?? false,
      opensAt: gate?.opensAt?.toISOString() ?? null,
      invites: rows.map((i) => ({ email: i.email, createdAt: i.createdAt.toISOString() })),
    }
  })

  app.post('/admin/invites', { preHandler, schema: { body: inviteBody, response: schema } }, async (req, reply) => {
    await db.insert(invites).values({ email: req.body.email.toLowerCase() }).onConflictDoNothing()
    return reply.code(204).send(null)
  })

  app.delete('/admin/invites', { preHandler, schema: { body: inviteBody, response: schema } }, async (req, reply) => {
    await db.delete(invites).where(eq(invites.email, req.body.email.toLowerCase()))
    return reply.code(204).send(null)
  })

  app.put('/admin/invite-gate', { preHandler, schema: { body: inviteGateBody, response: schema } }, async (req, reply) => {
    const { inviteOnly, opensAt } = req.body
    await db.update(inviteGate).set({ inviteOnly, opensAt: opensAt ? new Date(opensAt) : null })
    return reply.code(204).send(null)
  })
}
