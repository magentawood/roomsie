import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { errorResponse, formA, goalResponse, newGoalResponse, turnBody, turnResponse, visitorKeyHeader, type AnalyticsEvent, type AssistantParts, type ChipTap, type FormA } from '@roomsie/contract'
import { runTap, runTurn, type AssistantDeps } from '../assistant/assistant'
import { optionalUser, type AuthOptions } from '../auth'
import { createGoal, createVisitorSession, goalOf, lastReplyOf, saveTurn, turnsOf, visitorSessionOf, type Asker, type UserTurn } from './store'

/** The user agent only goes into the device hash, so any length passes. */
const headers = z.object({ [visitorKeyHeader]: z.string().min(1).max(100).optional(), 'user-agent': z.string().optional() })
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
    schema: { headers, params, body: turnBody, response: { 200: turnResponse, 400: errorResponse, 404: errorResponse, 409: errorResponse } },
  }, async (req, reply) => {
    const asker = await askerOf(req, req.headers[visitorKeyHeader])
    const goal = await goalOf(options.db, req.params.id, asker)
    if (!goal) return reply.code(404).send({ error: 'not found' })
    const last = await lastReplyOf(options.db, goal.id)
    const input = { goalId: goal.id, last, form: goal.form }
    const deps = { ...options, req }
    const turn = 'tap' in req.body ? await tapTurn(input, req.body.tap, deps) : await typedTurn(input, req.body.text, deps)
    if (!turn) return reply.code(400).send({ error: 'not valid: areas' })
    const turns = await saveTurn(options.db, { id: goal.id, seen: goal.updatedAt, asker }, turn.form, turn.user, turn.reply)
    if (!turns) return reply.code(409).send({ error: 'the chat changed in a different tab: send the message again' })
    if (!last) v1.analytics.track(req, { name: 'interview_started' })
    for (const event of turn.events) v1.analytics.track(req, event)
    return { form: turn.form, turns }
  })
}

type TurnInput = { goalId: string; last: AssistantParts | null; form: FormA }

async function typedTurn(input: TurnInput, text: string, deps: AssistantDeps) {
  const { form, reply, conflicts, label, ownValues, hiddenPreferences: preferences } = await runTurn({ ...input, text }, deps)
  // The log of PD3c: each hidden preference that this turn stated stays on the turn (T-58).
  const parts = { ...label, ...(Object.keys(preferences).length && { preferences }) }
  const events: AnalyticsEvent[] = [...conflicts.map(({ slot }) => ({ name: 'slot_conflict' as const, slot })), { name: 'turn_routed', band: label.band }]
  return { form, reply, user: { text, inputMethod: 'typed', parts, ownValues } satisfies UserTurn, events }
}

/** A tap is not one of the typed turns of the turn cap, and has no label of the router (PD9, T-09). */
async function tapTurn(input: TurnInput, tap: ChipTap, deps: AssistantDeps) {
  const tapped = await runTap({ ...input, tap }, deps)
  if (!tapped) return null
  const user = { text: tapped.text, inputMethod: 'chip', parts: tap, ownValues: { religion: null, community: null } } satisfies UserTurn
  return { form: tapped.form, reply: tapped.reply, user, events: [] }
}
