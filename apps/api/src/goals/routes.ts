import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { errorResponse, formA, goalResponse, newGoalResponse, turnBody, turnResponse, visitorKeyHeader } from '@roomsie/contract'
import { runTurn, type AssistantDeps } from '../assistant/assistant'
import { optionalUser, type AuthOptions } from '../auth'
import { createGoal, createVisitorSession, goalOf, lastReplyOf, saveTurn, turnsOf, visitorSessionOf, type Asker } from './store'

/** A long user agent is cut, not refused: it only goes into the device hash. */
const headers = z.object({ [visitorKeyHeader]: z.string().min(1).max(100).optional(), 'user-agent': z.string().optional().transform((ua) => ua?.slice(0, 500)) })
const params = z.object({ id: z.uuid() })

/** The chat of a goal is open to a visitor, with no sign-in (PD6b). The visitor key is the only way into a visitor goal. */
export function goalRoutes(v1: FastifyInstance, options: AuthOptions & Omit<AssistantDeps, 'req'>) {
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const askerOf = async (req: FastifyRequest, key: string | undefined): Promise<Asker> =>
    ({ userId: req.user?.id ?? null, sessionId: key ? await visitorSessionOf(options.db, key) : null })

  app.post('/goals', { preHandler: optionalUser(options), schema: { headers, response: { 201: newGoalResponse } } }, async (req, reply) => {
    const asker = await askerOf(req, req.headers[visitorKeyHeader])
    let visitorKey: string | null = null
    if (!asker.userId && !asker.sessionId) {
      const session = await createVisitorSession(options.db, { ip: req.ip, userAgent: req.headers['user-agent'] ?? '' })
      asker.sessionId = session.id
      visitorKey = session.key
    }
    const id = await createGoal(options.db, asker)
    return reply.code(201).send({ id, form: formA.parse({}), turns: [], visitorKey })
  })

  app.get('/goals/:id', { preHandler: optionalUser(options), schema: { headers, params, response: { 200: goalResponse, 404: errorResponse } } }, async (req, reply) => {
    const goal = await goalOf(options.db, req.params.id, await askerOf(req, req.headers[visitorKeyHeader]))
    if (!goal) return reply.code(404).send({ error: 'not found' })
    return { id: goal.id, form: goal.form, turns: await turnsOf(options.db, goal.id) }
  })

  app.post('/goals/:id/turns', {
    preHandler: optionalUser(options),
    schema: { headers, params, body: turnBody, response: { 200: turnResponse, 404: errorResponse, 409: errorResponse } },
  }, async (req, reply) => {
    const asker = await askerOf(req, req.headers[visitorKeyHeader])
    const goal = await goalOf(options.db, req.params.id, asker)
    if (!goal) return reply.code(404).send({ error: 'not found' })
    const last = await lastReplyOf(options.db, goal.id)
    const { text } = req.body
    const { form, reply: answer, conflicts } = await runTurn({ goalId: goal.id, text, lastQuestion: last?.text ?? null, asked: last?.asked ?? null, form: goal.form }, { ...options, req })
    const turns = await saveTurn(options.db, { id: goal.id, seen: goal.updatedAt, asker }, form, text, answer)
    if (!turns) return reply.code(409).send({ error: 'the chat changed in a different tab: send the message again' })
    if (!last) v1.analytics.track(req, { name: 'interview_started' })
    for (const { slot } of conflicts) v1.analytics.track(req, { name: 'slot_conflict', slot })
    return { form, turns }
  })
}
