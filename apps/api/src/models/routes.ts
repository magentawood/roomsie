import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { aiOverviewResponse, errorResponse, modelCheckResponse, modelSwitchBody, modelSwitchLogResponse, modelSwitchState, noContent } from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'
import { requireModerator, type AuthOptions } from '../auth'
import { emailsOf } from '../users'
import { aiOverview, type AiSources } from './overview'
import { flipSwitch, switchLog, switchState } from './switch'

/** The AI pipeline of the admin and its Gemini switch (T-65), and the live checks after a deploy: the model keys (T-11) and the bot of the spend alert (T-29). */
export function modelRoutes(v1: FastifyInstance, options: AuthOptions & AiSources) {
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireModerator(options)

  app.get('/admin/ai', { preHandler, schema: { response: { 200: aiOverviewResponse, 404: errorResponse } } }, (req) => aiOverview(options, req.log))

  /** A flip acts on the next model call, and the team hears of it in Telegram. */
  app.put('/admin/ai/switch', { preHandler, schema: { body: modelSwitchBody, response: { 200: modelSwitchState, 404: errorResponse } } }, async (req) => {
    if (!await flipSwitch(options.db, req.user!.id, req.body.geminiOnly)) return switchState(options.db)
    const by = (await emailsOf(options.db, [req.user!.id])).get(req.user!.id) ?? 'a moderator'
    const models = options.models?.settings
    const to = req.body.geminiOnly ? `the fallback model${models ? `, ${models.fallback}` : ''}` : `the main model${models ? `, ${models.primary}` : ''}`
    await v1.teamAlert(`roomsie: ${by} switched all model calls to ${to}.`)
      .catch((err: unknown) => reportError(err, { where: 'models.switch', log: req.log }))
    return switchState(options.db)
  })

  app.get('/admin/ai/switch-log', { preHandler, schema: { response: { 200: modelSwitchLogResponse, 404: errorResponse } } }, async () => ({ flips: await switchLog(options.db) }))

  app.post('/admin/model-check', { preHandler, schema: { response: { 200: modelCheckResponse, 404: errorResponse, 503: errorResponse } } }, async (req, reply) => {
    if (!options.models) return reply.code(503).send({ error: 'the model keys are not set' })
    return { models: await options.models.check(req) }
  })

  app.post('/admin/alert-check', { preHandler, schema: { response: { 204: noContent, 404: errorResponse, 502: errorResponse, 503: errorResponse } } }, async (_req, reply) => {
    if (!options.spend.telegram) return reply.code(503).send({ error: 'the Telegram settings are not set' })
    try {
      await v1.teamAlert('roomsie: the spend alert works.')
    } catch (err) {
      // The status of Telegram tells a wrong token (401) from a wrong chat (400).
      return reply.code(502).send({ error: err instanceof Error ? err.message : 'Telegram failed' })
    }
    return reply.code(204).send(null)
  })
}
