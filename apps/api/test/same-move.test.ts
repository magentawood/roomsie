import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { formA, goalResponse, goalsResponse, newGoalResponse, sameMoveResponse, turnResponse, visitorKeyHeader } from '@roomsie/contract'
import { looksLikeSameMove } from '../src/goals/same-move'
import { events as eventRows } from '../src/analytics/schema'
import { chatTurns, goals } from '../src/db/schema'
import { seedCatalogues } from '../src/db/seed-axes'
import { testApp, type TestApp } from './app'
import { createTestAnalyticsDb, type TestAnalyticsDb } from './db'
import { down, fakeVendors, keys, routed, scored } from './vendors'

let t: TestApp<'asha'>
let analytics: TestAnalyticsDb
beforeAll(async () => {
  analytics = await createTestAnalyticsDb()
  t = await testApp(['asha'], undefined, keys, analytics.db)
  await seedCatalogues(t.db)
})
afterAll(async () => {
  await t.close()
  await analytics.drop()
})
afterEach(() => { vi.unstubAllGlobals() })

type Goal = { id: string; key: string }
/** A goal of a visitor. With `key`, a goal in the same visitor session. */
async function visitorGoal(key?: string, start?: object): Promise<Goal & { started: ReturnType<typeof newGoalResponse.parse> }> {
  const res = await t.app.inject({ method: 'POST', url: '/v1/goals', payload: start, headers: key ? { [visitorKeyHeader]: key } : {} })
  expect(res.statusCode).toBe(201)
  const started = newGoalResponse.parse(res.json())
  return { id: started.id, key: key ?? started.visitorKey!, started }
}
const send = (goal: Goal, body: object) => t.app.inject({ method: 'POST', url: `/v1/goals/${goal.id}/turns`, payload: body, headers: { [visitorKeyHeader]: goal.key } })
const sent = async (goal: Goal, text: string) => {
  const res = await send(goal, { text })
  expect(res.statusCode).toBe(200)
  return turnResponse.parse(res.json())
}
const answer = (goal: Goal, value: 'same' | 'separate') =>
  t.app.inject({ method: 'POST', url: `/v1/goals/${goal.id}/same-move`, payload: { answer: value }, headers: { [visitorKeyHeader]: goal.key } })
const answered = async (goal: Goal, value: 'same' | 'separate') => {
  const res = await answer(goal, value)
  expect(res.statusCode).toBe(200)
  return sameMoveResponse.parse(res.json())
}
const read = async (goal: Goal) => t.app.inject({ method: 'GET', url: `/v1/goals/${goal.id}`, headers: { [visitorKeyHeader]: goal.key } })
const goalOf = async (goal: Goal) => goalResponse.parse((await read(goal)).json())
/** The model calls of a fake vendor, of each handler. */
const calls = (requests: ReturnType<typeof fakeVendors>) => requests.length + requests.router.length + requests.composer.length + requests.observer.length + requests.advisor.length
const steps = async () => {
  await t.flushEvents()
  return (await analytics.db.select({ fields: eventRows.fields }).from(eventRows).where(eq(eventRows.name, 'same_move'))).map((row) => (row.fields as { step: string }).step)
}

const question = "Quick check before I search: you already have a chat for a move going. Is this the same move? I won't change anything until you say."
const roomInBandra = () => scored({ intent: 'room', areas: [{ words: 'Bandra West', slug: 'bandra-west' }] })
/** A visitor with an open goal: a room in Bandra West, and the question of the budget. */
async function bandraRoom() {
  const first = await visitorGoal()
  fakeVendors({ deepseek: [roomInBandra()] })
  const { turns } = await sent(first, 'a room in Bandra West')
  expect(turns[1].text).toBe('Got it: a room in a shared flat, Bandra West. What is your monthly budget?')
  return first
}
/** A new goal of the same visitor, with a first message that looks like the same move. */
async function heldGoal(first: Goal, text = 'need a room in Bandra West, under 30k', fields: object = { intent: 'room', areas: [{ words: 'Bandra West', slug: 'bandra-west' }], budget: 'under 30k' }) {
  const next = await visitorGoal(first.key)
  const requests = fakeVendors({ deepseek: [scored(fields)] })
  const { form, turns } = await sent(next, text)
  return { next, form, turns, requests }
}

describe('"Same move?" on the first message of a new goal (Figma 67:6489)', () => {
  it('holds a message that looks like an open goal: the question with its chip title, and no change to either goal', async () => {
    const first = await bandraRoom()
    const before = await steps()
    const { next, form, turns, requests } = await heldGoal(first)
    expect(turns.map((turn) => turn.text)).toEqual(['need a room in Bandra West, under 30k', question])
    expect(turns[1]).toMatchObject({ chips: null, sameMove: { title: 'Room hunting in Bandra West' } })
    expect(form).toEqual(formA.parse({}))
    expect(requests.composer).toEqual([])
    expect((await goalOf(first)).form.budget.source).toBe('empty')
    expect((await goalOf(next)).turns.at(-1)?.sameMove).toEqual({ title: 'Room hunting in Bandra West' })
    expect(await steps()).toEqual([...before, 'asked'])
  })

  it('asks again for a typed message while it waits, with no model call, and refuses a tap', async () => {
    const { next } = await heldGoal(await bandraRoom())
    const requests = fakeVendors({})
    const again = await sent(next, 'yes')
    expect(again.turns[1]).toMatchObject({ text: 'First, tap one of the two answers: is this the same move? Nothing changes until you say.', sameMove: { title: 'Room hunting in Bandra West' } })
    expect(again.form).toEqual(formA.parse({}))
    expect(calls(requests)).toBe(0)
    const tap = await send(next, { tap: { slot: 'budget', value: 'under_25k' } })
    expect(tap.statusCode).toBe(409)
  })

  it('"No, it\'s a separate move" applies the held message here with no model call, and the search goes on', async () => {
    const first = await bandraRoom()
    const { next } = await heldGoal(first)
    const before = await steps()
    const requests = fakeVendors({})
    const result = await answered(next, 'separate')
    expect(calls(requests)).toBe(0)
    expect(result.goalId).toBe(next.id)
    expect(result.turns.map((turn) => [turn.role, turn.text])).toEqual([
      ['user', "No, it's a separate move"],
      ['assistant', 'Got it: a room in a shared flat, Bandra West, up to ₹30,000. When do you want to move in?'],
    ])
    expect(result.form).toMatchObject({ intent: { value: ['room'] }, areas: { value: ['bandra-west'] }, budget: { value: { min: null, max: 30_000 } } })
    expect(result.title).toBe('Room hunting in Bandra West')
    expect((await goalOf(first)).form.budget.source).toBe('empty')
    expect(await steps()).toEqual([...before, 'separate'])
    // The question has its answer: a second answer changes nothing.
    expect((await answer(next, 'same')).statusCode).toBe(409)
  })

  it('"Same move" puts the held message and its reply in the other goal, and removes the new goal', async () => {
    const first = await bandraRoom()
    const { next, turns } = await heldGoal(first)
    const before = await steps()
    const requests = fakeVendors({})
    const result = await answered(next, 'same')
    expect(calls(requests)).toBe(0)
    expect(result.goalId).toBe(first.id)
    expect(result.turns.map((turn) => [turn.id === turns[0].id, turn.text])).toEqual([
      [true, 'need a room in Bandra West, under 30k'],
      [false, 'Got it: up to ₹30,000. When do you want to move in?'],
    ])
    const other = await goalOf(first)
    expect(other.form).toMatchObject({ intent: { value: ['room'] }, areas: { value: ['bandra-west'] }, budget: { value: { min: null, max: 30_000 } } })
    expect(other.turns.map((turn) => turn.text).slice(-2)).toEqual(result.turns.map((turn) => turn.text))
    expect((await read(next)).statusCode).toBe(404)
    const list = goalsResponse.parse((await t.app.inject({ method: 'GET', url: '/v1/goals', headers: { [visitorKeyHeader]: first.key } })).json())
    expect(list.goals.map((goal) => goal.id)).toEqual([first.id])
    expect(await t.db.$count(chatTurns, eq(chatTurns.goalId, next.id))).toBe(0)
    expect(await steps()).toEqual([...before, 'same'])
  })

  it('keeps an earlier stated value of the other goal, and asks which one to keep (PD3b)', async () => {
    const first = await bandraRoom()
    fakeVendors({ deepseek: [scored({ budget: '25k' })] })
    await sent(first, '25k')
    const { next } = await heldGoal(first)
    const result = await answered(next, 'same')
    expect(result.turns.at(-1)?.text).toBe('You said up to ₹25,000 before, and now up to ₹30,000. Which one should I keep?')
    expect(result.form.budget.value).toEqual({ min: null, max: 25_000 })
  })

  it('refuses "Same move" when the other goal closed in the meantime, and keeps the question', async () => {
    const first = await bandraRoom()
    const { next } = await heldGoal(first)
    const close = await t.app.inject({ method: 'POST', url: `/v1/goals/${first.id}/close`, payload: { where: 'dropped' }, headers: { [visitorKeyHeader]: first.key } })
    expect(close.statusCode).toBe(200)
    expect((await answer(next, 'same')).statusCode).toBe(409)
    expect((await answered(next, 'separate')).goalId).toBe(next.id)
  })

  it('asks for the same kind with no area on either side', async () => {
    const first = await visitorGoal()
    fakeVendors({ deepseek: [scored({ intent: 'pg' })] })
    await sent(first, 'PG chahiye')
    const { turns } = await heldGoal(first, 'looking for a PG', { intent: 'pg' })
    expect(turns[1]).toMatchObject({ text: question, sameMove: { title: 'New goal' } })
  })

  it('does not ask for a different kind, other areas, a closed goal, another visitor, a message with no place type, or a disclosure', async () => {
    const first = await bandraRoom()
    const noAsk = async (goal: Goal, text: string, fields: object, label?: object) => {
      const next = await visitorGoal(goal.key)
      fakeVendors({ deepseek: [scored(fields)], ...label })
      const { turns } = await sent(next, text)
      expect(turns[1].sameMove, text).toBeNull()
      expect(turns[1].text, text).not.toBe(question)
    }
    await noAsk(first, 'flatmates in Bandra West', { intent: 'flatmates', areas: [{ words: 'Bandra West', slug: 'bandra-west' }] })
    await noAsk(first, 'a room in Powai', { intent: 'room', areas: [{ words: 'Powai', slug: 'powai' }] })
    await noAsk(first, 'something in Bandra West', { areas: [{ words: 'Bandra West', slug: 'bandra-west' }] })
    await noAsk(first, 'my marriage ended, I need a room in Bandra West', { intent: 'room', areas: [{ words: 'Bandra West', slug: 'bandra-west' }] }, routed({ kinds: ['context', 'filters'], band: 'sensitive' }))
    const stranger = await visitorGoal()
    fakeVendors({ deepseek: [roomInBandra()] })
    expect((await sent(stranger, 'a room in Bandra West')).turns[1].sameMove).toBeNull()

    const other = await bandraRoom()
    expect((await t.app.inject({ method: 'POST', url: `/v1/goals/${other.id}/close`, payload: { where: 'roomsie' }, headers: { [visitorKeyHeader]: other.key } })).statusCode).toBe(200)
    await noAsk(other, 'a room in Bandra West', { intent: 'room', areas: [{ words: 'Bandra West', slug: 'bandra-west' }] })
  })

  it('asks only on the first message of a goal', async () => {
    const first = await bandraRoom()
    const next = await visitorGoal(first.key)
    fakeVendors({ deepseek: [scored({ budget: '30k' })] })
    await sent(next, 'budget 30k')
    fakeVendors({ deepseek: [roomInBandra()] })
    expect((await sent(next, 'a room in Bandra West')).turns[1].sameMove).toBeNull()
  })
})

describe('"Same move?" after the onboarding', () => {
  const start = { intent: 'room', area: 'bandra-santacruz', budget: 'under_25k' }

  it('holds the answers of the onboarding, and "Same move" gives the other goal only the reply', async () => {
    const first = await bandraRoom()
    const next = await visitorGoal(first.key, start)
    expect(next.started.form).toEqual(formA.parse({}))
    expect(next.started.turns.map((turn) => [turn.text, turn.sameMove])).toEqual([[question, { title: 'Room hunting in Bandra West' }]])
    expect(next.started.title).toBe('New goal')
    const result = await answered(next, 'same')
    expect(result.goalId).toBe(first.id)
    expect(result.turns.map((turn) => [turn.role, turn.text])).toEqual([['assistant', 'Got it: Bandra West, Bandra–Santacruz, up to ₹25,000. When do you want to move in?']])
    expect(result.form.areas.value).toEqual(['bandra-west', 'bandra-santacruz'])
    expect((await read(next)).statusCode).toBe(404)
  })

  it('"No, it\'s a separate move" starts the goal with the answers, as the onboarding does', async () => {
    const first = await bandraRoom()
    const next = await visitorGoal(first.key, start)
    const result = await answered(next, 'separate')
    expect(result.turns.map((turn) => turn.text)).toEqual(["No, it's a separate move", 'Got it: a room in a shared flat, Bandra–Santacruz, up to ₹25,000. When do you want to move in?'])
    expect(result.form).toMatchObject({ intent: { value: ['room'] }, areas: { value: ['bandra-santacruz'] }, budget: { value: { min: null, max: 25_000 } } })
  })

  it('checks the goals of a signed-in person too', async () => {
    fakeVendors({ deepseek: [scored({ intent: 'room', areas: [{ words: 'Powai', slug: 'powai' }] })] })
    const first = newGoalResponse.parse((await t.call('asha', 'POST', '/v1/goals')).json())
    expect((await t.call('asha', 'POST', `/v1/goals/${first.id}/turns`, { text: 'a room in Powai' })).statusCode).toBe(200)
    const next = newGoalResponse.parse((await t.call('asha', 'POST', '/v1/goals', { intent: 'room', area: 'powai-vikhroli' })).json())
    expect(next.turns[0]?.sameMove).toEqual({ title: 'Room hunting in Powai' })
    fakeVendors({ deepseek: [down()], gemini: [down()] })
    const result = sameMoveResponse.parse((await t.call('asha', 'POST', `/v1/goals/${next.id}/same-move`, { answer: 'same' })).json())
    expect(result.goalId).toBe(first.id)
    expect(await t.db.$count(goals, and(eq(goals.id, next.id)))).toBe(0)
  })
})

describe('the same move (unit)', () => {
  const form = (intent: string | null, ...areas: string[]) => formA.parse({
    ...(intent && { intent: { source: 'stated', value: intent } }), ...(areas.length && { areas: { source: 'stated', value: areas } }),
  })
  const group = (slug: string) => ({ 'bandra-west': 'bandra-santacruz', powai: 'powai-vikhroli' })[slug] ?? slug

  it('needs the same kind, and an area group in common or no area on either side', () => {
    expect(looksLikeSameMove(form('room', 'bandra-west'), form('pg', 'bandra-santacruz'), group)).toBe(true)
    expect(looksLikeSameMove(form('room'), form('whole_flat'), group)).toBe(true)
    expect(looksLikeSameMove(form('room', 'bandra-west'), form('flatmates', 'bandra-west'), group)).toBe(false)
    expect(looksLikeSameMove(form('room', 'bandra-west'), form('room', 'powai'), group)).toBe(false)
    expect(looksLikeSameMove(form('room', 'bandra-west'), form('room'), group)).toBe(false)
    expect(looksLikeSameMove(form(null, 'bandra-west'), form('room', 'bandra-west'), group)).toBe(false)
    expect(looksLikeSameMove(form('flatmates', 'powai'), form('flatmates', 'powai-vikhroli', 'thane'), group)).toBe(true)
  })
})
