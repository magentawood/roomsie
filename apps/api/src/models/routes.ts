import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { aiOverviewResponse, errorResponse, modelCheckResponse, modelSwitchBody, modelSwitchLogResponse, modelSwitchState, noContent } from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'
import { requireModerator, type AuthOptions } from '../auth'
import { aiOverview, type AiSources } from './overview'
import { flipSwitch, switchLog, switchState } from './switch'

/** The AI pipeline of the admin and its Gemini switch (T-65), and the live checks after a deploy: the model keys (T-11) and the bot of the spend alert (T-29). */
export function modelRoutes(v1: FastifyInstance, options: AuthOptions & AiSources) {
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireModerator(options)

  app.get('/admin/ai', { preHandler, schema: { response: { 200: aiOverviewResponse, 404: errorResponse } } }, () => aiOverview(options))

  /** A flip acts on the next model call, and the team hears of it in Telegram. A flip to the state of now changes nothing. */
  app.put('/admin/ai/switch', { preHandler, schema: { body: modelSwitchBody, response: { 200: modelSwitchState, 404: errorResponse } } }, async (req) => {
    if ((await switchState(options.db)).geminiOnly === req.body.geminiOnly) return switchState(options.db)
    await flipSwitch(options.db, req.user!.id, req.body.geminiOnly)
    const state = await switchState(options.db)
    const models = options.models?.settings
    const to = state.geminiOnly ? `the fallback model${models ? `, ${models.fallback}` : ''}` : `the main model${models ? `, ${models.primary}` : ''}`
    await v1.spend.notifyTeam(`roomsie: ${state.by ?? 'a moderator'} switched all model calls to ${to}.`)
      .catch((err: unknown) => reportError(err, { where: 'models.switch', log: req.log }))
    return state
  })

  app.get('/admin/ai/switch-log', { preHandler, schema: { response: { 200: modelSwitchLogResponse, 404: errorResponse } } }, async () => ({ flips: await switchLog(options.db) }))

  app.post('/admin/model-check', { preHandler, schema: { response: { 200: modelCheckResponse, 404: errorResponse, 503: errorResponse } } }, async (req, reply) => {
    if (!options.models) return reply.code(503).send({ error: 'the model keys are not set' })
    return { models: await options.models.check(req) }
  })

  app.post('/admin/alert-check', { preHandler, schema: { response: { 204: noContent, 404: errorResponse, 502: errorResponse, 503: errorResponse } } }, async (_req, reply) => {
    try {
      if (!await v1.spend.sendTestAlert()) return reply.code(503).send({ error: 'the Telegram settings are not set' })
    } catch (err) {
      // The status of Telegram tells a wrong token (401) from a wrong chat (400).
      return reply.code(502).send({ error: err instanceof Error ? err.message : 'Telegram failed' })
    }
    return reply.code(204).send(null)
  })
}
