import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { goalResponse, limitRefusal, newGoalResponse, turnResponse, visitorKeyHeader } from '@roomsie/contract'
import { events as eventRows } from '../src/analytics/schema'
import { anonymousSessions, goals, modelSpend } from '../src/db/schema'
import { limitSettings } from '../src/goals/settings'
import { spendSettings } from '../src/models/settings'
import { seedCatalogues } from '../src/db/seed-axes'
import { ipAddress, ipRangeOf } from '../src/goals/limits'
import { testApp, type TestApp } from './app'
import { createTestAnalyticsDb, type TestAnalyticsDb } from './db'
import { answer, down, fakeVendors, keys, scored } from './vendors'

// Small values, so each test reaches its limit in a few calls. The defaults have their own test.
const settings = {
  ...keys,
  VISITOR_TURN_CAP: '2', VISITOR_TURN_BACKSTOP: '4', VISITOR_SESSIONS_PER_DEVICE: '2', VISITOR_SESSIONS_PER_IP: '3', VISITOR_SESSIONS_PER_IP_RANGE: '4', TYPED_TURNS_PER_MINUTE: '5',
  DAILY_SPEND_RUPEES: '0.002',
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
let freshRange = 0
/** By default, each test chat comes from its own IP range, so the limits of the other tests do not stop it. */
async function visitorGoal(ip = `10.20.${freshRange++}.1`, userAgent = `agent-${Math.random()}`) {
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
    const walls = (await eventsNamed('wall_hit')).length
    expect(turnResponse.parse((await typed(goal, 'near the station')).json()).typedTurnsLeft).toBe(1)
    expect(turnResponse.parse((await typed(goal, 'any gym nearby?')).json()).typedTurnsLeft).toBe(0)
    expect((await eventsNamed('wall_hit')).length).toBe(walls + 1)
    const calls = requests.length + requests.router.length

    const capped = await typed(goal, 'one more')
    expect(capped.statusCode).toBe(403)
    expect(refusal(capped)).toEqual({ error: 'Sign in to keep chatting. Your search and results stay.', limit: 'turn_cap' })
    expect(requests.length + requests.router.length).toBe(calls)
    expect((await eventsNamed('wall_hit')).length).toBe(walls + 1)
    // A chip tap is not a typed turn (PD9).
    expect((await turn(goal, { tap: { slot: 'intent', value: 'pg' } })).statusCode).toBe(200)
  })

  it('counts the typed turns, and the results, of each goal of the visitor session', async () => {
    fakeVendors({ deepseek: [scored({}), scored({})] })
    const first = await visitorGoal()
    await tapToResults(first)
    await typed(first, 'hello')
    const second = newGoalResponse.parse((await t.app.inject({ method: 'POST', url: '/v1/goals', headers: { [visitorKeyHeader]: first.key } })).json())
    expect(second.typedTurnsLeft).toBe(1)
    await typed(first, 'and one more')
    // A new empty goal does not hide the results of the first goal from the cap.
    const third = newGoalResponse.parse((await t.app.inject({ method: 'POST', url: '/v1/goals', headers: { [visitorKeyHeader]: first.key } })).json())
    expect(third.typedTurnsLeft).toBe(0)
    expect((await typed({ id: third.id, key: first.key }, 'hi')).statusCode).toBe(403)
  })

  it('lets a visitor with no results go on after the cap, until the backstop', async () => {
    fakeVendors({ deepseek: [scored({}), scored({}), scored({}), scored({})] })
    const goal = await visitorGoal()
    const walls = (await eventsNamed('wall_hit')).length
    // Past the cap with no results, the line of the free messages hides until the backstop (the user, T-21).
    const left = []
    for (const text of ['hi', 'hello', 'are you there']) left.push(turnResponse.parse((await typed(goal, text)).json()).typedTurnsLeft)
    expect(left).toEqual([1, null, null])
    expect((await eventsNamed('wall_hit')).length).toBe(walls)
    expect(turnResponse.parse((await typed(goal, 'ok')).json()).typedTurnsLeft).toBe(0)
    expect((await eventsNamed('wall_hit')).length).toBe(walls + 1)
    const backstop = await typed(goal, 'and now?')
    expect([backstop.statusCode, refusal(backstop).limit]).toEqual([403, 'turn_cap'])
  })

  it('gives a signed-in person no cap and no count, also on a visitor goal before T-17 moves it', async () => {
    fakeVendors({ deepseek: [scored({}), scored({}), scored({})] })
    const goal = await visitorGoal()
    await tapToResults(goal)
    const token = await t.idToken('uid-asha', { claims: { email: 'asha@example.com', email_verified: true } })
    for (const text of ['one', 'two', 'three']) {
      const res = await t.app.inject({ method: 'POST', url: `/v1/goals/${goal.id}/turns`, payload: { text }, headers: { authorization: `Bearer ${token}`, [visitorKeyHeader]: goal.key } })
      expect([res.statusCode, turnResponse.parse(res.json()).typedTurnsLeft]).toEqual([200, null])
    }
    expect(newGoalResponse.parse((await t.call('asha', 'POST', '/v1/goals')).json()).typedTurnsLeft).toBeNull()
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
    await t.db.execute(sql`update chat_turns set created_at = created_at - interval '2 minutes' where goal_id in (select id from goals where user_id = ${t.ids.asha})`)
    for (const text of ['one', 'two', 'three', 'four', 'five']) expect((await t.call('asha', 'POST', `/v1/goals/${created.id}/turns`, { text })).statusCode).toBe(200)
    const fast = await t.call('asha', 'POST', `/v1/goals/${created.id}/turns`, { text: 'six' })
    expect([fast.statusCode, refusal(fast)]).toEqual([429, { error: "You're sending fast. Wait a moment, then send it again.", limit: 'too_fast' }])
    expect((await eventsNamed('limit_hit')).slice(before).map(({ fields }) => (fields as { limit: string }).limit)).toEqual(['too_fast'])
  })

  it('refuses a new visitor chat when the address of the load balancer is not an IP address', async () => {
    expect((await visitorFrom('not-an-address')).statusCode).toBe(400)
  })

  it('takes the address of a request from the load balancer, and keeps only its hash', async () => {
    const hashOfGoal = async (id: string) => (await t.db.select({ ipHash: anonymousSessions.ipHash }).from(anonymousSessions)
      .innerJoin(goals, eq(goals.anonymousSessionId, anonymousSessions.id)).where(eq(goals.id, id)))[0]!.ipHash
    const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')
    expect(await hashOfGoal((await visitorGoal('203.0.113.9')).id)).toBe(sha256('203.0.113.9'))
    // An IPv4 address in its IPv6 form counts as the IPv4 address.
    expect(await hashOfGoal((await visitorGoal('::ffff:203.0.113.10')).id)).toBe(sha256('203.0.113.10'))
  })

  it('takes /24 of an IPv4 address and /48 of an IPv6 address as its range', () => {
    const rangeOf = (ip: string) => ipRangeOf(ipAddress.parse(ip))
    expect(rangeOf('192.0.2.77')).toBe('192.0.2.0/24')
    expect(rangeOf('::ffff:192.0.2.77')).toBe('192.0.2.0/24')
    expect(rangeOf('2001:db8:1:2::1')).toBe('2001:db8:1::/48')
    expect(rangeOf('2001:0db8:0001:ffff:0:0:0:2')).toBe('2001:db8:1::/48')
  })
})

describe('the spend of the day (PD9)', () => {
  // Each call: 20 new and 100 cached tokens in, and 8 out, at the dollars of a million tokens of its vendor, at ₹88 for each dollar.
  const callCost = { deepseek: ((20 * 0.3 + 100 * 0.012 + 8 * 1.2) / 1e6) * 88, gemini: ((20 * 0.3 + 100 * 0.3 + 8 * 2.5) / 1e6) * 88 }
  /** A goal of asha, with no spend today and none of her typed turns in the last minute. */
  async function freshSpend() {
    const created = newGoalResponse.parse((await t.call('asha', 'POST', '/v1/goals')).json())
    await t.app.spend.settled()
    await t.db.delete(modelSpend)
    await t.db.execute(sql`update chat_turns set created_at = created_at - interval '2 minutes' where goal_id in (select id from goals where user_id = ${t.ids.asha})`)
    return created.id
  }
  const spendOfToday = async () => {
    await t.app.spend.settled()
    return (await t.db.select().from(modelSpend))[0]!
  }

  it('adds the cost of each model attempt, and sends each Telegram alert one time', async () => {
    const requests = fakeVendors({ deepseek: [scored({}), scored({}), scored({})] })
    const goalId = await freshSpend()
    expect((await t.call('asha', 'POST', `/v1/goals/${goalId}/turns`, { text: 'room in Thane' })).statusCode).toBe(200)
    const day = await spendOfToday()
    expect(day).toMatchObject({ day: '2026-11-02', alertedPercent: 100 })
    expect(Number(day.rupees)).toBeCloseTo(2 * callCost.deepseek, 5)
    // The router and the extractor run at the same time: one call reaches 74% and the other 148%, so each alert goes once.
    const texts = requests.telegram.map((r) => String(r.body.text))
    expect(texts).toHaveLength(2)
    expect(texts).toEqual(expect.arrayContaining([
      expect.stringMatching(/^roomsie: the model spend of today is ₹[\d.]+, 70% of the daily amount of ₹[\d.]+\.$/),
      expect.stringMatching(/^roomsie: the model spend of today is ₹[\d.]+, 100% of the daily amount of ₹[\d.]+\.$/),
    ]))
    expect(requests.telegram[0]!.body.chat_id).toBe('-100123')
    expect(requests.telegram[0]!.url).toBe('https://api.telegram.org/botbot-token/sendMessage')
    // The chat keeps working past the daily amount, and no alert goes again.
    expect((await t.call('asha', 'POST', `/v1/goals/${goalId}/turns`, { text: 'and Navi Mumbai' })).statusCode).toBe(200)
    await t.app.spend.settled()
    expect(requests.telegram).toHaveLength(2)
  })

  it('adds the cost of a fallback attempt at the price of its vendor', async () => {
    fakeVendors({ deepseek: [down()], gemini: [answer(JSON.stringify({}))] })
    const goalId = await freshSpend()
    expect((await t.call('asha', 'POST', `/v1/goals/${goalId}/turns`, { text: 'room in Thane' })).statusCode).toBe(200)
    // The router on DeepSeek, the failed DeepSeek attempt with no tokens, and the extractor on Gemini.
    expect(Number((await spendOfToday()).rupees)).toBeCloseTo(callCost.deepseek + callCost.gemini, 5)
  })
})

describe('the settings of the limits', () => {
  it('has the first values that the user decided as defaults', () => {
    expect(limitSettings.parse({})).toEqual({ turnCap: 5, turnBackstop: 15, sessionsPerDevice: 10, sessionsPerIp: 100, sessionsPerIpRange: 500, typedTurnsPerMinute: 10 })
    expect(spendSettings.parse({})).toEqual({ dailyRupees: 500, telegram: null })
  })
})
