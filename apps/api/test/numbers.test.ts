import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import type { FastifyBaseLogger } from 'fastify'
import { adminHomeResponse, productNumbersResponse, type AnalyticsEvent, type ProductNumbersResponse } from '@roomsie/contract'
import { createAnalyticsDb } from '../src/analytics/client'
import { events } from '../src/analytics/schema'
import { productCard, productNumbers } from '../src/numbers/numbers'
import { daysBefore, istDateOf, todayInIst } from '../src/time'
import { testApp, type TestApp } from './app'
import { createTestAnalyticsDb, type TestAnalyticsDb } from './db'

let t: TestApp<'moderator' | 'member'>
let analytics: TestAnalyticsDb
beforeAll(async () => {
  analytics = await createTestAnalyticsDb()
  t = await testApp(['moderator', 'member'], undefined, {}, analytics.db)
})
afterAll(async () => {
  await t.close()
  await analytics.drop()
})

// 15:00 IST on the 5th, some months ahead: inside the monthly tables of the events (migration 0000). Each test has its own
// months, away from the other tests and from the events of the route test.
const base = new Date()
const fifthOf = (months: number) => new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, 5, 9, 30))
const now = fifthOf(3)
const today = istDateOf(now)
const daysAgo = (from: Date) => (days: number, time: string) => new Date(`${daysBefore(istDateOf(from), days)}T${time}+05:30`)
const at = daysAgo(now)
const event = (createdAt: Date, { name, ...fields }: AnalyticsEvent) => ({ name, eventVersion: 1, actor: null, createdAt, fields })
const chat = (createdAt: Date) => event(createdAt, { name: 'interview_started' })
const log = () => ({ error: vi.fn() }) as unknown as FastifyBaseLogger
const step = (response: ProductNumbersResponse, name: string) => response.numbers!.steps.find((s) => s.step === name)

describe('the product numbers', () => {
  it('counts today until now against yesterday until the same time, from the raw events', async () => {
    await analytics.db.insert(events).values([
      chat(at(0, '00:00:00')), chat(at(0, '14:59:00')), chat(at(0, '15:30:00')),
      chat(at(1, '09:00:00')), chat(at(1, '16:00:00')), chat(at(2, '12:00:00')),
      event(at(0, '10:00:00'), { name: 'results_shown', count: 4 }),
      event(at(0, '10:00:00'), { name: 'signed_in', newAccount: true }), event(at(0, '11:00:00'), { name: 'signed_in', newAccount: false }),
      event(at(1, '10:00:00'), { name: 'signed_in', newAccount: true }),
      event(at(0, '12:00:00'), { name: 'connect_sent', to: 'person' }), event(at(0, '12:00:00'), { name: 'connect_sent', to: 'listing' }),
      event(at(0, '13:00:00'), { name: 'goal_closed', where: 'roomsie' }), event(at(0, '13:00:00'), { name: 'goal_closed', where: 'elsewhere' }),
      event(at(0, '13:30:00'), { name: 'goal_closed', where: 'roomsie' }), event(at(1, '13:00:00'), { name: 'goal_closed', where: 'dropped' }),
      event(at(0, '09:00:00'), { name: 'limit_hit', limit: 'ip' }), event(at(0, '09:00:00'), { name: 'report_filed', subject: 'person', reason: 'fake' }),
      event(at(0, '09:00:00'), { name: 'slot_conflict', slot: 'budget' }), event(at(0, '09:10:00'), { name: 'slot_conflict', slot: 'budget' }),
    ])
    const response = await productNumbers(analytics.db, 'today', now, log())
    expect(response).toMatchObject({ period: 'today', from: today, to: today })
    const numbers = response.numbers!
    expect(numbers.steps.map((s) => s.step)).toEqual(['chats', 'results', 'wall', 'signedIn', 'requests', 'accepted', 'closed'])
    // The chat at 15:30 is after now, and the chat of yesterday at 16:00 is after the same time.
    expect(step(response, 'chats')).toEqual({ step: 'chats', now: 2, before: 1 })
    expect(step(response, 'signedIn')).toEqual({ step: 'signedIn', now: 2, before: 1 })
    expect(step(response, 'requests')).toEqual({ step: 'requests', now: 2, before: 0 })
    expect(step(response, 'closed')).toEqual({ step: 'closed', now: 3, before: 1 })
    expect(numbers.newAccounts).toEqual({ now: 1, before: 1 })
    expect(numbers.where).toEqual([{ value: 'roomsie', count: 2 }, { value: 'elsewhere', count: 1 }])
    expect(numbers.limits).toEqual([{ value: 'ip', count: 1 }])
    expect(numbers.reports).toEqual([{ value: 'fake', count: 1 }])
    expect(numbers.answers).toEqual([{ value: 'budget', count: 2 }])
    expect(await productCard(analytics.db, now, log())).toEqual({
      subject: 'product_numbers', today: { chats: { now: 2, before: 1 }, newAccounts: { now: 1, before: 1 }, requests: { now: 2, before: 0 } },
    })
  })

  it('counts 7 and 30 whole days that end yesterday, from the rollup of the job, against the days before them', async () => {
    const later = fifthOf(6)
    const back = daysAgo(later)
    const day = istDateOf(later)
    // Each chat is a day back: 1 to 7 is the week, 8 to 14 the week before, 1 to 30 the month, 31 to 60 the month before.
    await analytics.db.insert(events).values([
      chat(back(0, '00:00:00')), chat(back(1, '23:59:00')), chat(back(7, '00:00:00')), chat(back(8, '23:59:00')), chat(back(14, '08:00:00')),
      chat(back(15, '08:00:00')), chat(back(30, '08:00:00')), chat(back(31, '08:00:00')), chat(back(60, '08:00:00')), chat(back(61, '08:00:00')),
      event(back(3, '08:00:00'), { name: 'goal_closed', where: 'elsewhere' }), event(back(4, '08:00:00'), { name: 'goal_closed', where: 'elsewhere' }),
      event(back(5, '08:00:00'), { name: 'goal_closed', where: 'roomsie' }),
    ])
    // The days come only from the rollup: before the job, they have no count.
    expect(step(await productNumbers(analytics.db, 'week', later, log()), 'chats')).toMatchObject({ now: 0, before: 0 })
    // The job also counts today here, and the week leaves today out.
    const rollUp = () => analytics.db.execute(sql`select jobs.roll_up_events(${daysBefore(day, 61)}::date, ${day}::date)`)
    await rollUp()
    // A second run counts the same days again, and adds nothing.
    await rollUp()
    const week = await productNumbers(analytics.db, 'week', later, log())
    expect(week).toMatchObject({ period: 'week', from: daysBefore(day, 7), to: daysBefore(day, 1) })
    expect(step(week, 'chats')).toEqual({ step: 'chats', now: 2, before: 2 })
    expect(week.numbers!.where).toEqual([{ value: 'elsewhere', count: 2 }, { value: 'roomsie', count: 1 }])
    const month = await productNumbers(analytics.db, 'month', later, log())
    expect(month).toMatchObject({ period: 'month', from: daysBefore(day, 30), to: daysBefore(day, 1) })
    expect(step(month, 'chats')).toEqual({ step: 'chats', now: 6, before: 2 })
  })

  it('gives no numbers when the analytics database is not set or refuses the connection', async () => {
    const down = createAnalyticsDb('postgres://x@127.0.0.1:1/none')
    const errors = log()
    expect(await productNumbers(down, 'week', now, errors)).toEqual({ period: 'week', from: daysBefore(today, 7), to: daysBefore(today, 1), numbers: null })
    expect(await productCard(down, now, errors)).toEqual({ subject: 'product_numbers', today: null })
    expect(errors.error).toHaveBeenCalledTimes(2)
    expect(await productNumbers(undefined, 'today', now, errors)).toEqual({ period: 'today', from: today, to: today, numbers: null })
    // After the failed reads, an end that waits for the connection does not return here.
    await down.$client.end({ timeout: 0 })
  })

  it('gives the numbers and the card of the home to a moderator, and not found to a person with no role', async () => {
    await analytics.db.insert(events).values([chat(new Date())])
    const res = await t.call('moderator', 'GET', '/v1/admin/numbers?period=week')
    expect(res.statusCode).toBe(200)
    expect(productNumbersResponse.parse(res.json())).toMatchObject({ period: 'week', from: daysBefore(todayInIst(), 7), to: daysBefore(todayInIst(), 1) })
    const todayRes = productNumbersResponse.parse((await t.call('moderator', 'GET', '/v1/admin/numbers')).json())
    expect(todayRes.period).toBe('today')
    expect(step(todayRes, 'chats')).toMatchObject({ now: 1 })
    const card = adminHomeResponse.parse((await t.call('moderator', 'GET', '/v1/admin/home')).json()).cards.find((c) => c.subject === 'product_numbers')
    expect(card).toMatchObject({ today: { chats: { now: 1 } } })
    expect((await t.call('moderator', 'GET', '/v1/admin/numbers?period=year')).statusCode).toBe(400)
    expect((await t.call('member', 'GET', '/v1/admin/numbers')).statusCode).toBe(404)
    expect((await t.call(null, 'GET', '/v1/admin/numbers')).statusCode).toBe(401)
  })
})
