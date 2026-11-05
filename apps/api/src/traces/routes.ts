import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { adminTurnResponse, adminTurnsQuery, adminTurnsResponse, errorResponse, traceViewsResponse } from '@roomsie/contract'
import { requireModerator, type AuthOptions } from '../auth'
import { logView, turnOf, turnsOf, viewsOf } from './store'

/** The turns of the AI pipeline, one turn with its traces, and the log of the opens (T-64). Moderators only. */
export function traceRoutes(v1: FastifyInstance, options: AuthOptions) {
  const { db } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireModerator(options)

  app.get('/admin/ai/turns', { preHandler, schema: { querystring: adminTurnsQuery, response: { 200: adminTurnsResponse, 404: errorResponse } } }, (req) => turnsOf(db, req.query))

  /** Each open goes in the audit log, after the read, so the page tells the open before this one. */
  app.get('/admin/ai/turns/:key', {
    preHandler, schema: { params: z.object({ key: z.uuid() }), response: { 200: adminTurnResponse, 404: errorResponse } },
  }, async (req, reply) => {
    const turn = await turnOf(db, req.params.key)
    if (!turn) return reply.code(404).send({ error: 'not found' })
    await logView(db, req.user!.id, turn)
    return turn
  })

  app.get('/admin/ai/trace-views', { preHandler, schema: { response: { 200: traceViewsResponse, 404: errorResponse } } }, async () => ({ views: await viewsOf(db) }))
}
