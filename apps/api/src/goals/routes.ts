import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  closeGoalBody, errorResponse, formA, goalFeedbackBody, goalResponse, goalsResponse, goalStart, limitRefusal, newGoalResponse, noContent, turnBody, turnResponse, visitorKeyHeader, waitlistBody,
  type AnalyticsEvent, type ChipTap, type Comparison,
} from '@roomsie/contract'
import { runStart, runTap, runTurn, type AssistantDeps, type TurnInput } from '../assistant/assistant'
import { optionalUser, requireUser, type AuthOptions } from '../auth'
import { comparisonOf } from '../compare/compare'
import { saveGoalFeedback } from '../feedback/read'
import { capStateOf, chatLimitOf, limitLines, networkOf, tooFast, typedTurnsLeft } from './limits'
import type { LimitSettings } from './settings'
import { observationsOf } from '../observations/read'
import { joinWaitlist } from '../waitlist/store'
import {
  claimSession, createGoal, createVisitorSession, goalOf, goalsOf, lastRegisterOf, lastReplyOf, ownerOf, recentTurnsOf, saveTurn, setGoalStatus, turnsOf, visitorSessionOf, type Asker, type UserTurn,
} from './store'

/** The user agent only goes into the device hash, so any length passes. */
const visitorKey = z.string().min(1).max(100)
const headers = z.object({ [visitorKeyHeader]: visitorKey.optional(), 'user-agent': z.string().optional() })
const params = z.object({ id: z.uuid() })

/** The chat of a goal is open to a visitor, with no sign-in (PD6b). The visitor key is the only way into a visitor goal. */
export function goalRoutes(v1: FastifyInstance, options: AuthOptions & Omit<AssistantDeps, 'req'> & { limits: LimitSettings }) {
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const askerOf = async (req: FastifyRequest, key: string | undefined): Promise<Asker> =>
    ({ userId: req.user?.id ?? null, sessionId: key ? await visitorSessionOf(options.db, key) : null })

  app.post('/goals', { preHandler: optionalUser(options), schema: { headers, body: goalStart.nullish(), response: { 201: newGoalResponse, 400: errorResponse, 429: limitRefusal } } }, async (req, reply) => {
    // The check of the answers comes before a visitor session exists (T-48).
    const start = req.body ? await runStart({ last: null, form: formA.parse({}), lastRegister: null, start: req.body }, { ...options, req }) : undefined
    if (start === null) return reply.code(400).send({ error: 'not valid: area' })
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
    const goal = await createGoal(options.db, asker, start)
    return reply.code(201).send({ ...goal, form: start?.form ?? formA.parse({}), visitorKey, typedTurnsLeft: typedTurnsLeft(await capStateOf(options.db, asker, options.limits)), outsidePlaces: [], status: 'open' })
  })

  app.get('/goals/:id', { preHandler: optionalUser(options), schema: { headers, params, response: { 200: goalResponse, 404: errorResponse } } }, async (req, reply) => {
    const asker = await askerOf(req, req.headers[visitorKeyHeader])
    const goal = await goalOf(options.db, req.params.id, asker)
    if (!goal) return reply.code(404).send({ error: 'not found' })
    const { id, form, outsidePlaces, status } = goal
    return { id, form, turns: await turnsOf(options.db, id), typedTurnsLeft: typedTurnsLeft(await capStateOf(options.db, asker, options.limits)), outsidePlaces, status }
  })

  app.get('/goals', { preHandler: optionalUser(options), schema: { headers, response: { 200: goalsResponse } } }, async (req) =>
    ({ goals: await goalsOf(options.db, await askerOf(req, req.headers[visitorKeyHeader])) }))

  // Safe to repeat: only a change of the status logs an event (T-50).
  app.post('/goals/:id/close', { preHandler: optionalUser(options), schema: { headers, params, body: closeGoalBody, response: { 204: noContent, 404: errorResponse } } }, async (req, reply) => {
    const changed = await setGoalStatus(options.db, req.params.id, await askerOf(req, req.headers[visitorKeyHeader]), 'closed')
    if (changed === null) return reply.code(404).send({ error: 'not found' })
    if (changed) v1.analytics.track(req, { name: 'goal_closed', where: req.body.where })
    return reply.code(204).send(null)
  })

  app.post('/goals/:id/reopen', { preHandler: optionalUser(options), schema: { headers, params, response: { 204: noContent, 404: errorResponse } } }, async (req, reply) => {
    const changed = await setGoalStatus(options.db, req.params.id, await askerOf(req, req.headers[visitorKeyHeader]), 'open')
    if (changed === null) return reply.code(404).send({ error: 'not found' })
    if (changed) v1.analytics.track(req, { name: 'goal_reopened' })
    return reply.code(204).send(null)
  })

  // One feedback for each closed goal, from its owner: the limit that lets a visitor send it (T-50).
  app.post('/goals/:id/feedback', {
    preHandler: optionalUser(options), schema: { headers, params, body: goalFeedbackBody, response: { 204: noContent, 404: errorResponse, 409: errorResponse } },
  }, async (req, reply) => {
    const goal = await goalOf(options.db, req.params.id, await askerOf(req, req.headers[visitorKeyHeader]))
    if (!goal) return reply.code(404).send({ error: 'not found' })
    if (goal.status !== 'closed') return reply.code(409).send({ error: 'Close the goal first.' })
    if (!(await saveGoalFeedback(options.db, goal.id, req.body))) return reply.code(409).send({ error: 'You sent feedback for this goal already.' })
    return reply.code(204).send(null)
  })

  app.post('/goals/:id/turns', {
    preHandler: optionalUser(options),
    schema: { headers, params, body: turnBody, response: { 200: turnResponse, 400: errorResponse, 401: errorResponse, 403: limitRefusal, 404: errorResponse, 409: errorResponse, 429: limitRefusal } },
  }, async (req, reply) => {
    const asker = await askerOf(req, req.headers[visitorKeyHeader])
    const goal = await goalOf(options.db, req.params.id, asker)
    if (!goal) return reply.code(404).send({ error: 'not found' })
    if (goal.status === 'closed') return reply.code(409).send({ error: 'This goal is closed. Reopen it to keep chatting.' })
    // A comparison needs a sign-in, as a card does (PD6b), and cards that the person can see. Both before any model call (T-49).
    let comparison: Comparison | null = null
    if ('text' in req.body && req.body.compare) {
      if (!req.user) return reply.code(401).send({ error: 'sign in to compare' })
      comparison = await comparisonOf(options.db, req.user.id, req.body.compare)
      if (!comparison) return reply.code(400).send({ error: 'not valid: compare' })
    }
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
    const turn = 'tap' in req.body ? await tapTurn(input, req.body.tap, deps) : await typedTurn({ ...input, comparison }, req.body.text, asker, deps)
    if (!turn) return reply.code(400).send({ error: 'not valid: areas' })
    // A place that a turn names again moves to the end, so the newest place is last (T-22b).
    const named = new Set(turn.outsidePlaces)
    const outsidePlaces = [...goal.outsidePlaces.filter((place) => !named.has(place)), ...named]
    const turns = await saveTurn(options.db, { id: goal.id, seen: goal.updatedAt, asker }, { form: turn.form, outsidePlaces }, turn.user, turn.reply)
    if (!turns) return reply.code(409).send({ error: 'the chat changed in a different tab: send the message again' })
    if (!last) v1.analytics.track(req, { name: 'interview_started' })
    for (const event of turn.events) v1.analytics.track(req, event)
    const after = await capStateOf(options.db, asker, options.limits)
    // The wall opens at the moment of the cap, so the event goes with the turn that reaches it (PD9).
    if (after.state === 'wall' && before.state !== 'wall') v1.analytics.track(req, { name: 'wall_hit' })
    return { form: turn.form, turns, typedTurnsLeft: typedTurnsLeft(after), outsidePlaces }
  })

  // Safe to repeat: a second claim moves nothing (T-17).
  app.post('/goals/claim', {
    preHandler: requireUser(options),
    schema: { headers: z.object({ [visitorKeyHeader]: visitorKey }), response: { 204: noContent } },
  }, async (req, reply) => {
    await claimSession(options.db, req.headers[visitorKeyHeader], req.user!.id)
    return reply.code(204).send(null)
  })

  // Three emails a chat: a script must first pass the chat limits (T-22a).
  app.post('/goals/:id/waitlist', {
    preHandler: optionalUser(options),
    schema: { headers, params, body: waitlistBody, response: { 204: noContent, 400: errorResponse, 404: errorResponse, 429: errorResponse } },
  }, async (req, reply) => {
    const goal = await goalOf(options.db, req.params.id, await askerOf(req, req.headers[visitorKeyHeader]))
    if (!goal) return reply.code(404).send({ error: 'not found' })
    const joined = await joinWaitlist(options.db, { ...req.body, goalId: goal.id })
    if (!joined) return reply.code(429).send({ error: 'This chat cannot add more emails to the waitlist.' })
    return reply.code(204).send(null)
  })
}

async function typedTurn(input: TurnInput & { comparison: Comparison | null }, text: string, asker: Asker, deps: AssistantDeps) {
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
