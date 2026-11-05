import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { adminTurnResponse, adminTurnsResponse, newGoalResponse, traceDays, traceViewsResponse } from '@roomsie/contract'
import { tracePrompts, traces } from '../src/db/schema'
import { goneOnOf } from '../src/traces/store'
import { testApp, type TestApp } from './app'
import { down, fakeVendors, keys, room, routed } from './vendors'

let t: TestApp<'moderator' | 'member' | 'asha' | 'ravi'>
let goalId: string
beforeAll(async () => {
  t = await testApp(['moderator', 'member', 'asha', 'ravi'], undefined, keys)
  await t.liveCard('asha', 'Asha Rao')
  goalId = newGoalResponse.parse((await t.call('asha', 'POST', '/v1/goals')).json()).id
  // Two typed turns for each test. The composer fails at DeepSeek and at Gemini, so the scripted reply goes out.
  await typed('room in powai, only jain flatmates', { deepseek: [room()], ...routed({}), composer: { deepseek: [down()], gemini: [down()] } })
  await typed('budget 20k', { deepseek: [room()], ...routed({}) })
  vi.unstubAllGlobals()
})
afterAll(() => t.close())
afterEach(() => { vi.unstubAllGlobals() })

const typed = async (text: string, vendors: Parameters<typeof fakeVendors>[0], { who, goal }: { who: 'asha' | 'ravi'; goal: string } = { who: 'asha', goal: goalId }) => {
  fakeVendors(vendors)
  expect((await t.call(who, 'POST', `/v1/goals/${goal}/turns`, { text })).statusCode).toBe(200)
}
const turns = async (query = '') => adminTurnsResponse.parse((await t.call('moderator', 'GET', `/v1/admin/ai/turns${query}`)).json())
const open = async (key: string) => t.call('moderator', 'GET', `/v1/admin/ai/turns/${key}`)

describe('the traces of the AI pipeline (T-64)', () => {
  it('gives each typed turn with a session code, its number, its band and language, its calls and its result', async () => {
    const { turns: listed, counts } = await turns()
    expect(listed.map((r) => [r.turn, r.band, r.language, r.script, r.result, r.resultRole])).toEqual([
      [2, 'core', 'english', 'latin', 'failed', 'composer'], [1, 'core', 'english', 'latin', 'failed', 'composer'],
    ])
    expect(listed[1]).toMatchObject({ calls: 3, sessionCode: listed[0]!.sessionCode })
    expect(listed[0]!.sessionCode).toMatch(/^s-[0-9a-f]{4}$/)
    expect(counts).toEqual({ failed: 2, fallback: 2, slow: 0 })
  })

  it('finds the turns of a session code, and of each filter', async () => {
    const [newest] = (await turns()).turns
    expect((await turns(`?q=${newest!.sessionCode}`)).turns).toHaveLength(2)
    expect((await turns(`?q=${newest!.sessionCode.slice(2)}`)).turns).toHaveLength(2)
    expect((await turns('?q=s-0000')).turns).toEqual([])
    expect((await turns('?filter=failed')).turns).toHaveLength(2)
    expect((await turns('?filter=fallback')).turns).toHaveLength(2)
    expect((await turns('?filter=slow')).turns).toEqual([])
    expect((await t.call('moderator', 'GET', '/v1/admin/ai/turns')).body).not.toMatch(/asha/i)
  })

  it('finds a turn slower than 8 s', async () => {
    const [call] = await t.db.select().from(traces).where(eq(traces.goalId, goalId)).orderBy(traces.startedAt, traces.attempt).limit(1)
    await t.db.insert(traces).values({ ...call!, id: '0199e4b0-0000-7000-8000-000000000003', turnKey: '0199e4b0-0000-7000-8000-000000000004', ms: 9000 })
    expect((await turns('?filter=slow')).turns.map((r) => [r.key, r.ms])).toEqual([['0199e4b0-0000-7000-8000-000000000004', 9000]])
    await t.db.delete(traces).where(eq(traces.turnKey, '0199e4b0-0000-7000-8000-000000000004'))
  })

  it('opens a turn with each call, masked, with no name or email, and logs each open', async () => {
    const key = (await turns()).turns.at(-1)!.key
    const first = await open(key)
    expect(first.body).not.toMatch(/asha/i)
    const turn = adminTurnResponse.parse(first.json())
    // The system prompts are code, so they keep their words: the mask is for the words of the person and of the models.
    expect(JSON.stringify(turn.attempts.map((c) => [c.messages, c.answer]))).not.toMatch(/jain/i)
    expect(turn.calls).toBe(3)
    expect(turn.attempts.map((c) => [c.role, c.attempt, c.fallback, c.outcome]).sort()).toEqual([
      ['composer', 1, false, 'failed'], ['composer', 2, true, 'failed'], ['extractor', 1, false, 'ok'], ['router', 1, false, 'ok'],
    ])
    expect(turn.attempts.find((c) => c.role === 'extractor')!.messages[0]!.content).toContain('only [hidden] flatmates')
    expect(turn.attempts.find((c) => c.role === 'router')!.systemPrompt.name).toMatch(/^router · [0-9a-f]{8}$/)
    expect(turn.lastView).toBeNull()
    const again = adminTurnResponse.parse((await open(key)).json())
    expect(again.lastView).toMatchObject({ by: 'moderator@example.com' })
    const { views } = traceViewsResponse.parse((await t.call('moderator', 'GET', '/v1/admin/ai/trace-views')).json())
    expect(views.slice(0, 2).map((v) => [v.sessionCode, v.turn, v.by])).toEqual(Array(2).fill([turn.sessionCode, 1, 'moderator@example.com']))
  })

  it('is not found for a person with no admin role, or for a turn that is gone', async () => {
    const key = (await turns()).turns[0]!.key
    for (const url of ['/v1/admin/ai/turns', `/v1/admin/ai/turns/${key}`, '/v1/admin/ai/trace-views']) expect((await t.call('member', 'GET', url)).statusCode).toBe(404)
    expect((await open('0199e4b0-0000-7000-8000-000000000001')).statusCode).toBe(404)
  })

  it('gives the day that the nightly job deletes a trace: its first run at 04:15 IST after 30 days', () => {
    expect(goneOnOf(new Date('2026-11-04T21:42:00+05:30'))).toBe('2026-12-05')
    expect(goneOnOf(new Date('2026-11-04T03:00:00+05:30'))).toBe('2026-12-04')
  })

  it('deletes the traces older than 30 days with the nightly job, and each prompt that no trace uses', async () => {
    const [kept] = await t.db.select().from(traces).where(eq(traces.goalId, goalId)).orderBy(traces.startedAt, traces.attempt).limit(1)
    await t.db.insert(tracePrompts).values({ hash: 'unused', text: 'An old prompt.' })
    await t.db.insert(traces).values({ ...kept!, id: '0199e4b0-0000-7000-8000-000000000002', startedAt: new Date(Date.now() - (traceDays + 1) * 86_400_000) })
    const before = await t.db.$count(traces)
    await t.db.execute(sql`select jobs.delete_old_traces()`)
    expect(await t.db.$count(traces)).toBe(before - 1)
    expect(await t.db.$count(tracePrompts, eq(tracePrompts.hash, 'unused'))).toBe(0)
  })

  it('deletes the traces of an account at once with the account', async () => {
    // An account of this test, so the other tests keep theirs.
    const ravisGoal = newGoalResponse.parse((await t.call('ravi', 'POST', '/v1/goals')).json()).id
    await typed('room in bandra', { deepseek: [room()], ...routed({}) }, { who: 'ravi', goal: ravisGoal })
    expect(await t.db.$count(traces, eq(traces.goalId, ravisGoal))).toBeGreaterThan(0)
    expect((await t.call('ravi', 'DELETE', '/v1/me')).statusCode).toBe(204)
    expect(await t.db.$count(traces, eq(traces.goalId, ravisGoal))).toBe(0)
  })
})
