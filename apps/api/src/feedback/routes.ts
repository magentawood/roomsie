import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { desc } from 'drizzle-orm'
import { errorResponse, feedbackBody, feedbackResponse, noContent } from '@roomsie/contract'
import { requireModerator, requireUser, type AuthOptions } from '../auth'
import { feedback } from '../db/schema'

/** Feedback from a signed-in person, which the moderators read (T-23a). T-50 sends to the same route. */
export function feedbackRoutes(v1: FastifyInstance, options: AuthOptions) {
  const { db } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()

  app.post('/feedback', { preHandler: requireUser(options), schema: { body: feedbackBody, response: { 204: noContent } } }, async (req, reply) => {
    await db.insert(feedback).values({ userId: req.user!.id, text: req.body.text })
    return reply.code(204).send(null)
  })

  app.get('/admin/feedback', { preHandler: requireModerator(options), schema: { response: { 200: feedbackResponse, 404: errorResponse } } }, async () => {
    const rows = await db.select({ id: feedback.id, text: feedback.text, createdAt: feedback.createdAt })
      .from(feedback).orderBy(desc(feedback.createdAt)).limit(100)
    return { feedback: rows.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })) }
  })
}
