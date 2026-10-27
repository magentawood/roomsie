import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, eq } from 'drizzle-orm'
import { alertSettings, noContent, pushTokenBody, pushTokenStatus } from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import { pushTokens, users } from '../db/schema'

/** The switches of Settings (T-55). Each tap saves at once. */
export function alertRoutes(v1: FastifyInstance, options: AuthOptions) {
  const { db } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireUser(options)

  app.get('/me/alerts', { preHandler, schema: { response: { 200: alertSettings } } }, async (req) => {
    const [user] = await db.select({ emailAlerts: users.emailAlerts }).from(users).where(eq(users.id, req.user!.id))
    return user!
  })

  app.put('/me/alerts', { preHandler, schema: { body: alertSettings, response: { 200: alertSettings } } }, async (req) => {
    await db.update(users).set({ emailAlerts: req.body.emailAlerts, updatedAt: new Date() }).where(eq(users.id, req.user!.id))
    return req.body
  })

  // A browser has one token. A different person who signs in on it takes it over: the named exception of ADR-0019.
  app.post('/me/push-tokens', { preHandler, schema: { body: pushTokenBody, response: { 204: noContent } } }, async (req, reply) => {
    await db.insert(pushTokens).values({ userId: req.user!.id, token: req.body.token })
      .onConflictDoUpdate({ target: pushTokens.token, set: { userId: req.user!.id } })
    return reply.code(204).send(null)
  })

  // A POST, not a GET: the token stays out of the URL and the logs.
  app.post('/me/push-tokens/status', { preHandler, schema: { body: pushTokenBody, response: { 200: pushTokenStatus } } }, async (req) => {
    const [mine] = await db.select({ id: pushTokens.id }).from(pushTokens).where(and(eq(pushTokens.token, req.body.token), eq(pushTokens.userId, req.user!.id)))
    return { registered: !!mine }
  })

  app.delete('/me/push-tokens', { preHandler, schema: { body: pushTokenBody, response: { 204: noContent } } }, async (req, reply) => {
    await db.delete(pushTokens).where(and(eq(pushTokens.token, req.body.token), eq(pushTokens.userId, req.user!.id)))
    return reply.code(204).send(null)
  })
}
