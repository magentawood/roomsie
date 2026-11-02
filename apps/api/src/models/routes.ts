import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { errorResponse, modelCheckResponse, noContent } from '@roomsie/contract'
import { requireModerator, type AuthOptions } from '../auth'
import type { Models } from './models'

/** The live checks after a deploy: the two model keys (T-11), and the bot of the spend alert (T-29). */
export function modelRoutes(v1: FastifyInstance, options: AuthOptions & { models?: Models }) {
  const app = v1.withTypeProvider<ZodTypeProvider>()
  app.post('/admin/model-check', { preHandler: requireModerator(options), schema: { response: { 200: modelCheckResponse, 404: errorResponse, 503: errorResponse } } }, async (req, reply) => {
    if (!options.models) return reply.code(503).send({ error: 'the model keys are not set' })
    return { models: await options.models.check(req) }
  })

  app.post('/admin/alert-check', { preHandler: requireModerator(options), schema: { response: { 204: noContent, 404: errorResponse, 502: errorResponse, 503: errorResponse } } }, async (_req, reply) => {
    try {
      if (!await v1.spend.sendTestAlert()) return reply.code(503).send({ error: 'the Telegram settings are not set' })
    } catch (err) {
      // The status of Telegram tells a wrong token (401) from a wrong chat (400).
      return reply.code(502).send({ error: err instanceof Error ? err.message : 'Telegram failed' })
    }
    return reply.code(204).send(null)
  })
}
