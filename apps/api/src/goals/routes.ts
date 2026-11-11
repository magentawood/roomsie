import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  assistantParts, closeGoalBody, closeGoalResponse, errorResponse, formA, goalFeedbackBody, goalResponse, goalsResponse, goalStart, limitRefusal, newGoalResponse, noContent, notesResponse,
  sameMoveBody, sameMoveLabels, sameMoveResponse, turnBody, turnResponse, visitorKeyHeader, waitlistBody,
  type AnalyticsEvent, type AssistantParts, type ChipTap, type FormA, type TurnLabel,
} from '@roomsie/contract'
import { heldReply, runHeld, runStart, runTap, runTurn, type AssistantDeps, type SelectedCards, type TurnInput } from '../assistant/assistant'
import { languageOf, lineOf } from '../assistant/lines'
import { observer } from '../assistant/handlers/observer/observer'
import { optionalUser, requireUser, type AuthOptions } from '../auth'
import { cardsOf } from '../compare/compare'
import type { Db } from '../db/client'
import { profileOf } from '../profiles/read'
import { hasGoalFeedback, saveGoalFeedback } from '../feedback/read'
import { capStateOf, chatLimitOf, limitLines, networkOf, tooFast, typedTurnsLeft } from './limits'
import type { LimitSettings } from './settings'
import { deleteObservation, notesOf, observationsOf, saveObservation } from '../observations/read'
import { joinWaitlist } from '../waitlist/store'
import { sameMoveOf } from './same-move'
import {
  claimSession, createGoal, createVisitorSession, firstTypedTurnOf, goalOf, goalsOf, lastRegisterOf, lastReplyOf, moveHeld, notesHintDue, ownerOf, recentTurnsOf, saveOnGoalOwner, saveTurn, setGoalStatus, titleOf, turnsOf,
  visitorSessionOf, type Asker, type UserTurn,
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
    const start = req.body ? await runStart({ last: null, form: await withProfileGender(options.db, req.user?.id, formA.parse({})), lastRegister: null, start: req.body }, { ...options, req }) : undefined
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
    // The answers of the onboarding wait for "Same move?" too, when an open goal looks like the same move.
    const target = start && await sameMoveOf(options.db, asker, start.form)
    const held = target && { form: formA.parse({}), reply: heldReply({ ...target, values: start.values, ambiguous: [], outsidePlaces: [], typed: false }, 'en') }
    const goal = await createGoal(options.db, asker, held || start)
    if (held) v1.analytics.track(req, { name: 'same_move', step: 'asked' })
    const form = held ? held.form : start?.form ?? formA.parse({})
    return reply.code(201).send({
      ...goal, form, visitorKey, typedTurnsLeft: typedTurnsLeft(await capStateOf(options.db, asker, options.limits)), outsidePlaces: [], status: 'open', title: await titleOf(options.db, form),
    })
  })

  app.get('/goals/:id', { preHandler: optionalUser(options), schema: { headers, params, response: { 200: goalResponse, 404: errorResponse } } }, async (req, reply) => {
    const asker = await askerOf(req, req.headers[visitorKeyHeader])
    const goal = await goalOf(options.db, req.params.id, asker)
    if (!goal) return reply.code(404).send({ error: 'not found' })
    const { id, form, outsidePlaces, status } = goal
    return {
      id, form, turns: await turnsOf(options.db, id), typedTurnsLeft: typedTurnsLeft(await capStateOf(options.db, asker, options.limits)), outsidePlaces, status, title: await titleOf(options.db, form),
    }
  })

  app.get('/goals', { preHandler: optionalUser(options), schema: { headers, response: { 200: goalsResponse } } }, async (req) =>
    ({ goals: await goalsOf(options.db, await askerOf(req, req.headers[visitorKeyHeader])) }))

  // Safe to repeat: only a change of the status logs an event (T-50).
  app.post('/goals/:id/close', {
    preHandler: optionalUser(options), schema: { headers, params, body: closeGoalBody, response: { 200: closeGoalResponse, 404: errorResponse } },
  }, async (req, reply) => {
    const change = await setGoalStatus(options.db, req.params.id, await askerOf(req, req.headers[visitorKeyHeader]), 'closed')
    if (!change) return reply.code(404).send({ error: 'not found' })
    if (change === 'changed') v1.analytics.track(req, { name: 'goal_closed', where: req.body.where })
    return { askFeedback: !(await hasGoalFeedback(options.db, req.params.id)) }
  })

  app.post('/goals/:id/reopen', { preHandler: optionalUser(options), schema: { headers, params, response: { 204: noContent, 404: errorResponse } } }, async (req, reply) => {
    const change = await setGoalStatus(options.db, req.params.id, await askerOf(req, req.headers[visitorKeyHeader]), 'open')
    if (!change) return reply.code(404).send({ error: 'not found' })
    if (change === 'changed') v1.analytics.track(req, { name: 'goal_reopened' })
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
    // A question about cards needs a sign-in, as a card does (PD6b), and cards that the person can see. Both before any model call (T-49).
    let cards: SelectedCards | null = null
    if ('text' in req.body && req.body.compare) {
      if (!req.user) return reply.code(401).send({ error: 'sign in to compare' })
      cards = await cardsOf(options.db, req.user.id, req.body.compare)
      if (!cards) return reply.code(400).send({ error: 'not valid: compare' })
    }
    // The cards on the screen help a question such as "how far is this listing?". A guest, or a card that went, only loses that help.
    const shown = 'text' in req.body && !cards && req.body.shown && req.user ? await cardsOf(options.db, req.user.id, req.body.shown) : null
    const last = await lastReplyOf(options.db, goal.id)
    // A limit refuses a typed turn before any model call. A tap has no limit (PD9, T-21).
    const before = await capStateOf(options.db, asker, options.limits)
    if ('text' in req.body && before.state === 'wall') return reply.code(403).send({ error: limitLines.turn_cap, limit: 'turn_cap' })
    if ('text' in req.body && await tooFast(options.db, asker, options.limits)) {
      v1.analytics.track(req, { name: 'limit_hit', limit: 'too_fast' })
      return reply.code(429).send({ error: limitLines.too_fast, limit: 'too_fast' })
    }
    const input = { goalId: goal.id, last, form: await withProfileGender(options.db, req.user?.id, goal.form), lastRegister: await lastRegisterOf(options.db, goal.id), notesHint: await notesHintDue(options.db, asker) }
    const deps = { ...options, req }
    // While "Same move?" waits, a message changes nothing: the question comes again, with no model call.
    if (last?.held && 'tap' in req.body) return reply.code(409).send({ error: 'Tap one of the two answers first.' })
    const turn = last?.held && 'text' in req.body ? heldAgain(input, last, req.body.text)
      : 'tap' in req.body ? await tapTurn(input, req.body.tap, deps) : await typedTurn({ ...input, cards, shown }, req.body.text, asker, deps)
    if (!turn) return reply.code(400).send({ error: 'not valid: areas' })
    // A place that a turn names again moves to the end, so the newest place is last (T-22b).
    const named = new Set(turn.outsidePlaces)
    const outsidePlaces = [...goal.outsidePlaces.filter((place) => !named.has(place)), ...named]
    const turns = await saveTurn(options.db, { id: goal.id, seen: goal.updatedAt, asker }, { form: turn.form, outsidePlaces }, turn.user, turn.reply)
    if (!turns) return reply.code(409).send({ error: 'the chat changed in a different tab: send the message again' })
    // A held first message starts the interview only after "No, it's a separate move".
    if (!last && !turn.held) v1.analytics.track(req, { name: 'interview_started' })
    if (!last && turn.held) v1.analytics.track(req, { name: 'same_move', step: 'asked' })
    for (const event of turn.events) v1.analytics.track(req, event)
    const after = await capStateOf(options.db, asker, options.limits)
    // The wall opens at the moment of the cap, so the event goes with the turn that reaches it (PD9).
    if (after.state === 'wall' && before.state !== 'wall') v1.analytics.track(req, { name: 'wall_hit' })
    const title = await titleOf(options.db, turn.form)
    // The last step before the reply: the queue starts the observer after the route sends it (PD7a).
    const { notePlan } = turn
    if (notePlan) {
      v1.observerQueue.later(async () => {
        const { notes } = await observer({ goalId: goal.id, text: turns[0].text, last }, deps)
        if (notes.length) await saveOnGoalOwner(options.db, goal.id, async (tx, owner) => {
          for (const note of notes) await saveObservation(tx, owner, { version: 1, ...note, turn: turns[0].id, visible: notePlan.visible })
        })
      })
    }
    return { form: turn.form, turns, typedTurnsLeft: typedTurnsLeft(after), outsidePlaces, title }
  })

  // The answer to "Same move?" (Figma 67:6489). A chip: no limit and no model call (PD9).
  app.post('/goals/:id/same-move', {
    preHandler: optionalUser(options), schema: { headers, params, body: sameMoveBody, response: { 200: sameMoveResponse, 404: errorResponse, 409: errorResponse } },
  }, async (req, reply) => {
    const asker = await askerOf(req, req.headers[visitorKeyHeader])
    const goal = await goalOf(options.db, req.params.id, asker)
    if (!goal) return reply.code(404).send({ error: 'not found' })
    if (goal.status === 'closed') return reply.code(409).send({ error: 'This goal is closed. Reopen it to keep chatting.' })
    const held = (await lastReplyOf(options.db, goal.id))?.held
    if (!held) return reply.code(409).send({ error: 'This question has its answer already.' })
    const lastRegister = await lastRegisterOf(options.db, goal.id)
    const deps = { ...options, req }
    const placesOf = (earlier: typeof goal.outsidePlaces) => [...earlier.filter((place) => !held.outsidePlaces.includes(place)), ...held.outsidePlaces]
    const answered = async (goalId: string, form: typeof goal.form, outsidePlaces: typeof goal.outsidePlaces, turns: z.infer<typeof sameMoveResponse>['turns']) => {
      v1.analytics.track(req, { name: 'same_move', step: req.body.answer })
      return { goalId, form, turns, typedTurnsLeft: typedTurnsLeft(await capStateOf(options.db, asker, options.limits)), outsidePlaces, title: await titleOf(options.db, form) }
    }

    if (req.body.answer === 'separate') {
      const { form, reply: answer } = await runHeld({ held, form: await withProfileGender(options.db, req.user?.id, goal.form), last: null, lastRegister }, deps)
      const outsidePlaces = placesOf(goal.outsidePlaces)
      const user = { text: sameMoveLabels.separate, inputMethod: 'chip', parts: { version: 1, sameMove: 'separate' }, ownValues: { religion: null, community: null } } satisfies UserTurn
      const turns = await saveTurn(options.db, { id: goal.id, seen: goal.updatedAt, asker }, { form, outsidePlaces }, user, answer)
      if (!turns) return reply.code(409).send({ error: 'the chat changed in a different tab: try again' })
      if (held.typed) v1.analytics.track(req, { name: 'interview_started' })
      return answered(goal.id, form, outsidePlaces, turns)
    }

    const other = await goalOf(options.db, held.goalId, asker)
    if (!other || other.status === 'closed') return reply.code(409).send({ error: "Your other chat is closed now. Tap \"No, it's a separate move\" to go on here." })
    const { form, reply: answer } = await runHeld({ held, form: other.form, last: await lastReplyOf(options.db, other.id), lastRegister }, deps)
    const outsidePlaces = placesOf(other.outsidePlaces)
    const heldTurnId = held.typed ? await firstTypedTurnOf(options.db, goal.id) : null
    const turns = await moveHeld(options.db, { id: goal.id, asker, heldTurnId }, { id: other.id, seen: other.updatedAt }, { form, outsidePlaces }, answer)
    if (!turns) return reply.code(409).send({ error: 'the chat changed in a different tab: try again' })
    return answered(other.id, form, outsidePlaces, turns)
  })

  // Safe to repeat: a second claim moves nothing (T-17).
  app.post('/goals/claim', {
    preHandler: requireUser(options),
    schema: { headers: z.object({ [visitorKeyHeader]: visitorKey }), response: { 204: noContent } },
  }, async (req, reply) => {
    await claimSession(options.db, req.headers[visitorKeyHeader], req.user!.id)
    return reply.code(204).send(null)
  })

  app.get('/notes', { preHandler: optionalUser(options), schema: { headers, response: { 200: notesResponse } } }, async (req) => {
    const asker = await askerOf(req, req.headers[visitorKeyHeader])
    return { notes: asker.userId || asker.sessionId ? await notesOf(options.db, ownerOf(asker)) : [] }
  })

  app.delete('/notes/:id', { preHandler: optionalUser(options), schema: { headers, params, response: { 204: noContent, 404: errorResponse } } }, async (req, reply) => {
    const asker = await askerOf(req, req.headers[visitorKeyHeader])
    if (!(asker.userId || asker.sessionId) || !(await deleteObservation(options.db, ownerOf(asker), req.params.id).returning()).length) return reply.code(404).send({ error: 'not found' })
    return reply.code(204).send(null)
  })

  // Three emails a chat: a script must first pass the chat limits (T-22a).
  app.post('/goals/:id/waitlist', {
    preHandler: optionalUser(options),
    schema: { headers, params, body: waitlistBody, response: { 204: noContent, 400: errorResponse, 404: errorResponse, 409: errorResponse, 429: errorResponse } },
  }, async (req, reply) => {
    const goal = await goalOf(options.db, req.params.id, await askerOf(req, req.headers[visitorKeyHeader]))
    if (!goal) return reply.code(404).send({ error: 'not found' })
    if (goal.status === 'closed') return reply.code(409).send({ error: 'This goal is closed. Reopen it to join the waitlist.' })
    const joined = await joinWaitlist(options.db, { ...req.body, goalId: goal.id })
    if (!joined) return reply.code(429).send({ error: 'This chat cannot add more emails to the waitlist.' })
    return reply.code(204).send(null)
  })
}

async function typedTurn(input: TurnInput & { cards: SelectedCards | null; shown: SelectedCards | null }, text: string, asker: Asker, deps: AssistantDeps) {
  const [turns, notes] = await Promise.all([recentTurnsOf(deps.db, input.goalId), observationsOf(deps.db, ownerOf(asker))])
  const context = { turns, formB: notes.map(({ key, value }) => ({ key, value })) }
  const sameMove = (form: FormA) => sameMoveOf(deps.db, asker, form, input.goalId)
  const { form, reply, conflicts, label, ownValues, hiddenPreferences: preferences, outsidePlaces, notePlan, held } = await runTurn({ ...input, text, context, sameMove }, deps)
  // The log of PD3c: each hidden preference that this turn stated stays on the turn (T-58).
  const parts = { ...label, ...(Object.keys(preferences).length && { preferences }) }
  const events: AnalyticsEvent[] = [...conflicts.map(({ slot }) => ({ name: 'slot_conflict' as const, slot })), { name: 'turn_routed', band: label.band }]
  return { form, reply, user: { text, inputMethod: 'typed', parts, ownValues } satisfies UserTurn, events, outsidePlaces, notePlan, held }
}

/**
 * A typed message while "Same move?" waits: the question again, and no change. No model reads the message, so its label has no band of
 * the router. It keeps the register of the held message, so the next replies keep its language.
 */
function heldAgain(input: Pick<TurnInput, 'lastRegister' | 'form'>, last: AssistantParts, text: string) {
  const parts: TurnLabel = { version: 1, kinds: [], band: 'core', register: input.lastRegister, danger: false, community: false, notes: false, routerBand: null }
  const reply = { version: 1 as const, text: lineOf('sameMoveAgain', languageOf(input.lastRegister)), parts: assistantParts.parse({ ...last, question: null }) }
  const user = { text, inputMethod: 'typed', parts, ownValues: { religion: null, community: null } } satisfies UserTurn
  return { form: input.form, reply, user, events: [] as AnalyticsEvent[], outsidePlaces: [], notePlan: null, held: true }
}

/** A tap is not one of the typed turns of the turn cap, and has no label of the router (PD9, T-09). */
async function tapTurn(input: TurnInput, tap: ChipTap, deps: AssistantDeps) {
  const tapped = await runTap({ ...input, tap }, deps)
  if (!tapped) return null
  const user = { text: tapped.text, inputMethod: 'chip', parts: { version: 1, tap }, ownValues: tapped.ownValues } satisfies UserTurn
  return { form: tapped.form, reply: tapped.reply, user, events: [], outsidePlaces: [], notePlan: null, held: false }
}

/**
 * A person with a profile has a gender, so a flatmate search never asks it: the profile fills the gender of the chat as a default,
 * and a stated gender stays (the founders, 2026-11-11).
 */
async function withProfileGender(db: Db, userId: string | undefined, form: FormA): Promise<FormA> {
  if (!userId || form.gender.source !== 'empty') return form
  const gender = (await profileOf(db, userId))?.gender
  return gender ? { ...form, gender: { source: 'default', value: gender } } : form
}
