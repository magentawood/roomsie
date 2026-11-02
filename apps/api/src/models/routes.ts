import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { alertCheckResponse, errorResponse, modelCheckResponse } from '@roomsie/contract'
import { requireModerator, type AuthOptions } from '../auth'
import type { Models } from './models'

/** The live check of the two keys after a deploy (T-11). */
export function modelRoutes(v1: FastifyInstance, options: AuthOptions & { models?: Models }) {
  const app = v1.withTypeProvider<ZodTypeProvider>()
  app.post('/admin/model-check', { preHandler: requireModerator(options), schema: { response: { 200: modelCheckResponse, 404: errorResponse, 503: errorResponse } } }, async (req, reply) => {
    if (!options.models) return reply.code(503).send({ error: 'the model keys are not set' })
    return { models: await options.models.check(req) }
  })

  /** The live check of the bot of the spend alert, before the launch (T-29). */
  app.post('/admin/alert-check', { preHandler: requireModerator(options), schema: { response: { 200: alertCheckResponse, 404: errorResponse, 503: errorResponse } } }, async (_req, reply) => {
    if (!await v1.spend.check()) return reply.code(503).send({ error: 'the Telegram settings are not set' })
    return { sent: true as const }
  })
}
