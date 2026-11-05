import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { aiOverviewResponse, errorResponse, modelCheckResponse, modelSwitchBody, modelSwitchLogResponse, modelSwitchState, noContent } from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'
import { requireModerator, type AuthOptions } from '../auth'
import { emailsOf } from '../users'
import type { Models } from './models'
import { aiOverview, switchState, type AiSources } from './overview'
import { flipSwitch, switchFlips } from './switch'

/** The live checks after a deploy: the two model keys (T-11), and the bot of the spend alert (T-29). */
export function modelRoutes(v1: FastifyInstance, options: AuthOptions & AiSources & { models?: Models }) {
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireModerator(options)

  app.get('/admin/ai', { preHandler, schema: { response: { 200: aiOverviewResponse, 404: errorResponse } } }, () => aiOverview(options))

  /** A flip acts on the next model call, and the team hears of it in Telegram (T-65). */
  app.put('/admin/ai/switch', { preHandler, schema: { body: modelSwitchBody, response: { 200: modelSwitchState, 404: errorResponse } } }, async (req) => {
    await flipSwitch(options.db, req.user!.id, req.body.geminiOnly)
    const state = await switchState(options.db)
    const text = `roomsie: ${state.by ?? 'a moderator'} ${state.geminiOnly ? 'switched all model calls to Gemini' : 'switched the model calls back to DeepSeek'}.`
    await v1.spend.notifyTeam(text).catch((err: unknown) => reportError(err, { where: 'models.switch', log: req.log }))
    return state
  })

  app.get('/admin/ai/switch', { preHandler, schema: { response: { 200: modelSwitchLogResponse, 404: errorResponse } } }, async () => {
    const flips = await switchFlips(options.db, 50)
    const emails = await emailsOf(options.db, flips.flatMap((f) => (f.userId ? [f.userId] : [])))
    return { flips: flips.map((f) => ({ geminiOnly: f.geminiOnly, at: f.at.toISOString(), by: (f.userId && emails.get(f.userId)) ?? null })) }
  })
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
