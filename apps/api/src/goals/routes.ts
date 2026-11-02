import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { errorResponse, formA, goalResponse, limitRefusal, newGoalResponse, noContent, turnBody, turnResponse, visitorKeyHeader, waitlistBody, type AnalyticsEvent, type ChipTap } from '@roomsie/contract'
import { runTap, runTurn, type AssistantDeps, type TurnInput } from '../assistant/assistant'
import { optionalUser, type AuthOptions } from '../auth'
import { capStateOf, chatLimitOf, limitLines, networkOf, tooFast, typedTurnsLeft } from './limits'
import type { LimitSettings } from './settings'
import { observationsOf } from '../observations/read'
import { joinWaitlist } from '../waitlist/store'
import { createGoal, createVisitorSession, goalOf, lastRegisterOf, lastReplyOf, ownerOf, recentTurnsOf, saveTurn, turnsOf, visitorSessionOf, type Asker, type UserTurn } from './store'

/** The user agent only goes into the device hash, so any length passes. */
const headers = z.object({ [visitorKeyHeader]: z.string().min(1).max(100).optional(), 'user-agent': z.string().optional() })
const params = z.object({ id: z.uuid() })

/** The chat of a goal is open to a visitor, with no sign-in (PD6b). The visitor key is the only way into a visitor goal. */
export function goalRoutes(v1: FastifyInstance, options: AuthOptions & Omit<AssistantDeps, 'req'> & { limits: LimitSettings }) {
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const askerOf = async (req: FastifyRequest, key: string | undefined): Promise<Asker> =>
    ({ userId: req.user?.id ?? null, sessionId: key ? await visitorSessionOf(options.db, key) : null })

  app.post('/goals', { preHandler: optionalUser(options), schema: { headers, response: { 201: newGoalResponse, 400: errorResponse, 429: limitRefusal } } }, async (req, reply) => {
    const asker = await askerOf(req, req.headers[visitorKeyHeader])
    let visitorKey: string | null = null
    if (!asker.userId && !asker.sessionId) {
      const network = networkOf({ ip: req.ip, userAgent: req.headers['user-agent'] ?? '' })
      if (!network) return reply.code(400).send({ error: 'not valid: address' })
      const limit = await chatLimitOf(options.db, network, options.limits)
      if (limit) {
        v1.analytics.track(req, { name: 'limit_hit', limit })
        return reply.code(429).send({ error: limitLines.too_many_chats, limit: 'too_many_chats' })
      }
      const session = await createVisitorSession(options.db, network)
      asker.sessionId = session.id
      visitorKey = session.key
    }
    const id = await createGoal(options.db, asker)
    return reply.code(201).send({ id, form: formA.parse({}), turns: [], visitorKey, typedTurnsLeft: typedTurnsLeft(await capStateOf(options.db, asker, options.limits)), outsidePlaces: [] })
  })

  app.get('/goals/:id', { preHandler: optionalUser(options), schema: { headers, params, response: { 200: goalResponse, 404: errorResponse } } }, async (req, reply) => {
    const asker = await askerOf(req, req.headers[visitorKeyHeader])
    const goal = await goalOf(options.db, req.params.id, asker)
    if (!goal) return reply.code(404).send({ error: 'not found' })
    return { id: goal.id, form: goal.form, turns: await turnsOf(options.db, goal.id), typedTurnsLeft: typedTurnsLeft(await capStateOf(options.db, asker, options.limits)), outsidePlaces: goal.outsidePlaces }
  })

  app.post('/goals/:id/turns', {
    preHandler: optionalUser(options),
    schema: { headers, params, body: turnBody, response: { 200: turnResponse, 400: errorResponse, 403: limitRefusal, 404: errorResponse, 409: errorResponse, 429: limitRefusal } },
  }, async (req, reply) => {
    const asker = await askerOf(req, req.headers[visitorKeyHeader])
    const goal = await goalOf(options.db, req.params.id, asker)
    if (!goal) return reply.code(404).send({ error: 'not found' })
    const last = await lastReplyOf(options.db, goal.id)
    // A limit refuses a typed turn before any model call. A tap has no limit (PD9, T-21).
    const before = await capStateOf(options.db, asker, options.limits)
    if ('text' in req.body && before.state === 'wall') return reply.code(403).send({ error: limitLines.turn_cap, limit: 'turn_cap' })
    if ('text' in req.body && await tooFast(options.db, asker, options.limits)) {
      v1.analytics.track(req, { name: 'limit_hit', limit: 'too_fast' })
      return reply.code(429).send({ error: limitLines.too_fast, limit: 'too_fast' })
    }
    const input = { goalId: goal.id, last, form: goal.form, lastRegister: await lastRegisterOf(options.db, goal.id) }
    const deps = { ...options, req }
    const turn = 'tap' in req.body ? await tapTurn(input, req.body.tap, deps) : await typedTurn(input, req.body.text, asker, deps)
    if (!turn) return reply.code(400).send({ error: 'not valid: areas' })
    const outsidePlaces = [...new Set([...goal.outsidePlaces, ...turn.outsidePlaces])]
    const turns = await saveTurn(options.db, { id: goal.id, seen: goal.updatedAt, asker }, { form: turn.form, outsidePlaces }, turn.user, turn.reply)
    if (!turns) return reply.code(409).send({ error: 'the chat changed in a different tab: send the message again' })
    if (!last) v1.analytics.track(req, { name: 'interview_started' })
    for (const event of turn.events) v1.analytics.track(req, event)
    const after = await capStateOf(options.db, asker, options.limits)
    // The wall opens at the moment of the cap, so the event goes with the turn that reaches it (PD9).
    if (after.state === 'wall' && before.state !== 'wall') v1.analytics.track(req, { name: 'wall_hit' })
    return { form: turn.form, turns, typedTurnsLeft: typedTurnsLeft(after), outsidePlaces }
  })

  // Only a place that the chat named, and a few emails for each chat: a script must first pass the chat limits (T-22a).
  app.post('/goals/:id/waitlist', {
    preHandler: optionalUser(options),
    schema: { headers, params, body: waitlistBody, response: { 204: noContent, 400: errorResponse, 404: errorResponse, 429: errorResponse } },
  }, async (req, reply) => {
    const goal = await goalOf(options.db, req.params.id, await askerOf(req, req.headers[visitorKeyHeader]))
    if (!goal) return reply.code(404).send({ error: 'not found' })
    if (!goal.outsidePlaces.includes(req.body.place)) return reply.code(400).send({ error: 'not valid: place' })
    const joined = await joinWaitlist(options.db, { email: req.body.email, area: req.body.place, goalId: goal.id })
    if (!joined) return reply.code(429).send({ error: 'This chat cannot add more emails to the waitlist.' })
    return reply.code(204).send(null)
  })
}

async function typedTurn(input: TurnInput, text: string, asker: Asker, deps: AssistantDeps) {
  const [turns, notes] = await Promise.all([recentTurnsOf(deps.db, input.goalId), observationsOf(deps.db, ownerOf(asker))])
  const context = { turns, formB: notes.map(({ key, value }) => ({ key, value })) }
  const { form, reply, conflicts, label, ownValues, hiddenPreferences: preferences, outsidePlaces } = await runTurn({ ...input, text, context }, deps)
  // The log of PD3c: each hidden preference that this turn stated stays on the turn (T-58).
  const parts = { ...label, ...(Object.keys(preferences).length && { preferences }) }
  const events: AnalyticsEvent[] = [...conflicts.map(({ slot }) => ({ name: 'slot_conflict' as const, slot })), { name: 'turn_routed', band: label.band }]
  return { form, reply, user: { text, inputMethod: 'typed', parts, ownValues } satisfies UserTurn, events, outsidePlaces }
}

/** A tap is not one of the typed turns of the turn cap, and has no label of the router (PD9, T-09). */
async function tapTurn(input: TurnInput, tap: ChipTap, deps: AssistantDeps) {
  const tapped = await runTap({ ...input, tap }, deps)
  if (!tapped) return null
  const user = { text: tapped.text, inputMethod: 'chip', parts: { version: 1, tap }, ownValues: tapped.ownValues } satisfies UserTurn
  return { form: tapped.form, reply: tapped.reply, user, events: [], outsidePlaces: [] }
}
