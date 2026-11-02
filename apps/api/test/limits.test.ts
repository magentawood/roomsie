import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { goalResponse, limitRefusal, newGoalResponse, turnResponse, visitorKeyHeader } from '@roomsie/contract'
import { events as eventRows } from '../src/analytics/schema'
import { modelSpend } from '../src/db/schema'
import { seedCatalogues } from '../src/db/seed-axes'
import { ipRangeOf } from '../src/goals/limits'
import { limitSettings } from '../src/goals/settings'
import { spendSettings } from '../src/models/settings'
import { testApp, type TestApp } from './app'
import { createTestAnalyticsDb, type TestAnalyticsDb } from './db'
import { fakeVendors, keys, scored } from './vendors'

// Small values, so each test reaches its limit in a few calls. The defaults have their own test.
const settings = {
  ...keys,
  VISITOR_TURN_CAP: '2', VISITOR_TURN_BACKSTOP: '4', VISITOR_SESSIONS_PER_DEVICE: '2', VISITOR_SESSIONS_PER_IP: '3', VISITOR_SESSIONS_PER_IP_RANGE: '4', TYPED_TURNS_PER_MINUTE: '5',
  DAILY_SPEND_RUPEES: '0.01', MODEL_PRICES_USD: JSON.stringify({ deepseek: { in: 1, cachedIn: 0.5, out: 2 }, gemini: { in: 1, cachedIn: 0.5, out: 2 } }), USD_TO_INR: '100',
  TELEGRAM_BOT_TOKEN: 'bot-token', TELEGRAM_CHAT_ID: '-100123',
}

let t: TestApp<'asha'>
let analytics: TestAnalyticsDb
beforeAll(async () => {
  analytics = await createTestAnalyticsDb()
  t = await testApp(['asha'], undefined, settings, analytics.db)
  await seedCatalogues(t.db)
})
afterAll(async () => {
  await t.close()
  await analytics.drop()
})
afterEach(() => { vi.unstubAllGlobals() })

/** A new visitor goal from one network address, as the load balancer adds it after any address that the client sent. */
const visitorFrom = (ip: string, userAgent = 'phone') =>
  t.app.inject({ method: 'POST', url: '/v1/goals', headers: { 'x-forwarded-for': `203.0.113.250, ${ip}`, 'user-agent': userAgent } })
async function visitorGoal(ip = '198.51.100.1', userAgent = `agent-${Math.random()}`) {
  const res = await visitorFrom(ip, userAgent)
  expect(res.statusCode).toBe(201)
  const goal = newGoalResponse.parse(res.json())
  return { id: goal.id, key: goal.visitorKey!, typedTurnsLeft: goal.typedTurnsLeft }
}
const turn = (goal: { id: string; key: string }, payload: object) =>
  t.app.inject({ method: 'POST', url: `/v1/goals/${goal.id}/turns`, payload, headers: { [visitorKeyHeader]: goal.key } })
const typed = (goal: { id: string; key: string }, text: string) => turn(goal, { text })
const tapToResults = async (goal: { id: string; key: string }) => {
  for (const tap of [{ slot: 'intent', value: 'room' }, { slot: 'areas', value: ['thane'] }, { slot: 'budget', value: 'under_25k' }]) expect((await turn(goal, { tap })).statusCode).toBe(200)
}
const eventsNamed = async (name: string) => {
  await t.flushEvents()
  return analytics.db.select({ fields: eventRows.fields }).from(eventRows).where(eq(eventRows.name, name))
}
const refusal = (res: { json: () => unknown }) => limitRefusal.parse(res.json())

describe('the turn cap of a visitor (PD9)', () => {
  it('gives a visitor the cap of typed turns once results show, then refuses the next with no model call and sends wall_hit', async () => {
    const requests = fakeVendors({ deepseek: [scored({}), scored({})] })
    const goal = await visitorGoal()
    expect(goal.typedTurnsLeft).toBe(2)
    await tapToResults(goal)
    expect(goalResponse.parse((await t.app.inject({ method: 'GET', url: `/v1/goals/${goal.id}`, headers: { [visitorKeyHeader]: goal.key } })).json()).typedTurnsLeft).toBe(2)
    expect(turnResponse.parse((await typed(goal, 'near the station')).json()).typedTurnsLeft).toBe(1)
    expect(turnResponse.parse((await typed(goal, 'any gym nearby?')).json()).typedTurnsLeft).toBe(0)
    const calls = requests.length + requests.router.length
    const walls = (await eventsNamed('wall_hit')).length

    const capped = await typed(goal, 'one more')
    expect(capped.statusCode).toBe(403)
    expect(refusal(capped)).toEqual({ error: 'Sign in to keep chatting. Your search and results stay.', limit: 'turn_cap' })
    expect(requests.length + requests.router.length).toBe(calls)
    expect((await eventsNamed('wall_hit')).length).toBe(walls + 1)
    // A chip tap is not a typed turn (PD9).
    expect((await turn(goal, { tap: { slot: 'intent', value: 'pg' } })).statusCode).toBe(200)
  })

  it('counts the typed turns of each goal of the visitor session', async () => {
    fakeVendors({ deepseek: [scored({}), scored({})] })
    const first = await visitorGoal()
    await tapToResults(first)
    await typed(first, 'hello')
    const second = newGoalResponse.parse((await t.app.inject({ method: 'POST', url: '/v1/goals', headers: { [visitorKeyHeader]: first.key } })).json())
    expect(second.typedTurnsLeft).toBe(1)
  })

  it('lets a visitor with no results go on after the cap, until the backstop', async () => {
    fakeVendors({ deepseek: [scored({}), scored({}), scored({}), scored({})] })
    const goal = await visitorGoal()
    for (const text of ['hi', 'hello', 'are you there', 'ok']) expect((await typed(goal, text)).statusCode).toBe(200)
    const backstop = await typed(goal, 'and now?')
    expect([backstop.statusCode, refusal(backstop).limit]).toEqual([403, 'turn_cap'])
  })

  it('gives a signed-in person no cap and no count', async () => {
    fakeVendors({ deepseek: [scored({}), scored({}), scored({})] })
    const created = newGoalResponse.parse((await t.call('asha', 'POST', '/v1/goals')).json())
    expect(created.typedTurnsLeft).toBeNull()
    for (const text of ['one', 'two', 'three']) {
      const res = await t.call('asha', 'POST', `/v1/goals/${created.id}/turns`, { text })
      expect(turnResponse.parse(res.json()).typedTurnsLeft).toBeNull()
    }
  })
})

describe('the rate limits (PD9)', () => {
  it('refuses a new visitor chat over the limit of a device, an IP address and an IP range, and records each limit', async () => {
    const before = (await eventsNamed('limit_hit')).length
    // A device is one address with one browser. The first address of the header is not the address of the request.
    await visitorGoal('192.0.2.10', 'same-browser')
    await visitorGoal('192.0.2.10', 'same-browser')
    const device = await visitorFrom('192.0.2.10', 'same-browser')
    expect([device.statusCode, refusal(device)]).toEqual([429, { error: 'Too many chats from this network today. Sign in, or come back tomorrow.', limit: 'too_many_chats' }])
    // The same address with a third browser: the IP limit is 3.
    await visitorGoal('192.0.2.10', 'other-browser')
    expect((await visitorFrom('192.0.2.10', 'fourth-browser')).statusCode).toBe(429)
    // Other addresses of the same /24: the range limit is 4.
    await visitorGoal('192.0.2.77')
    expect((await visitorFrom('192.0.2.78')).statusCode).toBe(429)
    expect((await visitorGoal('192.0.3.1')).id).toEqual(expect.any(String))
    const limits = (await eventsNamed('limit_hit')).slice(before).map(({ fields }) => (fields as { limit: string }).limit)
    expect(limits).toEqual(['device', 'ip', 'ip_range'])
  })

  it('gives a goal in the same session, and a signed-in person, no limit on chats', async () => {
    const goal = await visitorGoal('192.0.4.200', 'one')
    for (let i = 0; i < 5; i++) expect((await t.app.inject({ method: 'POST', url: '/v1/goals', headers: { [visitorKeyHeader]: goal.key } })).statusCode).toBe(201)
    for (let i = 0; i < 5; i++) expect((await t.call('asha', 'POST', '/v1/goals')).statusCode).toBe(201)
  })

  it('refuses a typed turn over the limit of a minute, also for a signed-in person', async () => {
    fakeVendors({ deepseek: [scored({}), scored({}), scored({}), scored({}), scored({})] })
    const before = (await eventsNamed('limit_hit')).length
    const created = newGoalResponse.parse((await t.call('asha', 'POST', '/v1/goals')).json())
    // The tests before this one sent typed turns as asha. A minute later they no longer count.
    await t.db.execute(sql`update chat_turns set created_at = created_at - interval '2 minutes'`)
    for (const text of ['one', 'two', 'three', 'four', 'five']) expect((await t.call('asha', 'POST', `/v1/goals/${created.id}/turns`, { text })).statusCode).toBe(200)
    const fast = await t.call('asha', 'POST', `/v1/goals/${created.id}/turns`, { text: 'six' })
    expect([fast.statusCode, refusal(fast)]).toEqual([429, { error: "You're sending fast. Wait a moment, then send it again.", limit: 'too_fast' }])
    expect((await eventsNamed('limit_hit')).slice(before).map(({ fields }) => (fields as { limit: string }).limit)).toEqual(['too_fast'])
  })

  it('takes /24 of an IPv4 address and /48 of an IPv6 address as its range', () => {
    expect(ipRangeOf('192.0.2.77')).toBe('192.0.2.0/24')
    expect(ipRangeOf('::ffff:192.0.2.77')).toBe('192.0.2.0/24')
    expect(ipRangeOf('2001:db8:1:2::1')).toBe('2001:db8:1::/48')
    expect(ipRangeOf('2001:0db8:0001:ffff:0:0:0:2')).toBe('2001:db8:1::/48')
  })
})

describe('the spend of the day (PD9)', () => {
  it('adds the cost of each model attempt, and sends each Telegram alert one time', async () => {
    const requests = fakeVendors({ deepseek: [scored({}), scored({}), scored({})] })
    const created = newGoalResponse.parse((await t.call('asha', 'POST', '/v1/goals')).json())
    await t.app.spend.settled()
    await t.db.delete(modelSpend)
    await t.db.execute(sql`update chat_turns set created_at = created_at - interval '2 minutes'`)
    // Each call: 20 new and 100 cached tokens in, and 8 out, at $1, $0.5 and $2 for each million, at ₹100 for each dollar.
    const perCall = (20 * 1 + 100 * 0.5 + 8 * 2) / 1e6 * 100
    expect((await t.call('asha', 'POST', `/v1/goals/${created.id}/turns`, { text: 'room in Thane' })).statusCode).toBe(200)
    await t.app.spend.settled()
    const [day] = await t.db.select().from(modelSpend)
    expect(day).toMatchObject({ day: '2026-11-02', alerted: 100 })
    expect(Number(day!.rupees)).toBeCloseTo(2 * perCall, 6)
    // The router and the extractor run at the same time: one call reaches 86% and the other 172%, so each alert goes once.
    const texts = requests.telegram.map((r) => String(r.body.text))
    expect(texts).toHaveLength(2)
    expect(texts).toEqual(expect.arrayContaining([
      expect.stringMatching(/^roomsie: the model spend of today is ₹0\.0\d, 70% of the daily amount of ₹0\.01\.$/),
      expect.stringMatching(/^roomsie: the model spend of today is ₹0\.0\d, 100% of the daily amount of ₹0\.01\.$/),
    ]))
    expect(requests.telegram[0]!.body.chat_id).toBe('-100123')
    expect(requests.telegram[0]!.url).toBe('https://api.telegram.org/botbot-token/sendMessage')
    // The chat keeps working past the daily amount, and no alert goes again.
    expect((await t.call('asha', 'POST', `/v1/goals/${created.id}/turns`, { text: 'and Navi Mumbai' })).statusCode).toBe(200)
    await t.app.spend.settled()
    expect(requests.telegram).toHaveLength(2)
  })
})

describe('the settings of the limits', () => {
  it('has the first values of the decisions of T-21 as defaults', () => {
    expect(limitSettings.parse({})).toEqual({ turnCap: 5, turnBackstop: 15, sessionsPerDevice: 10, sessionsPerIp: 100, sessionsPerIpRange: 500, typedTurnsPerMinute: 10 })
    const spend = spendSettings.parse({})
    expect(spend.dailyRupees).toBe(500)
    expect(spend.telegram).toBeNull()
    expect(Object.keys(spend.prices)).toEqual(['deepseek', 'gemini'])
  })
})
