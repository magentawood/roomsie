import type { FastifyBaseLogger } from 'fastify'
import { funnelSteps, type AdminHomeCard, type FunnelStep, type NumberPeriod, type ProductNumbersResponse } from '@roomsie/contract'
import type { AnalyticsDb } from '../analytics/client'
import { countsBetween, countsOfDays, type EventCount } from '../analytics/read'
import { bestEffort } from '../models/overview'
import { daysBefore, hoursBefore, istDateOf, startOfIstDay } from '../time'

/** The event of each step of the funnel (ADR-0012). */
const stepEvents: Record<FunnelStep, string> = {
  chats: 'interview_started', results: 'results_shown', wall: 'wall_hit', signedIn: 'signed_in', requests: 'connect_sent', accepted: 'connect_accepted', closed: 'goal_closed',
}
const periodDays: Record<Exclude<NumberPeriod, 'today'>, number> = { week: 7, month: 30 }

const totalOf = (counts: EventCount[], event: string, split = '', value = '') =>
  counts.find((c) => c.event === event && c.split === split && c.value === value)?.total ?? 0
const splitOf = (counts: EventCount[], event: string, split: string) =>
  counts.filter((c) => c.event === event && c.split === split).map(({ value, total }) => ({ value, count: total })).toSorted((a, b) => b.count - a.count || a.value.localeCompare(b.value))

/**
 * The counts of a period and of the period before it (T-66). Today and yesterday until the same time come from the
 * raw events (the exception of database.md); 7 and 30 days are the whole days that end yesterday, from the rollup.
 */
async function countsOf(db: AnalyticsDb, period: NumberPeriod, now: Date) {
  const today = istDateOf(now)
  if (period === 'today') {
    const [current, before] = await Promise.all([countsBetween(db, startOfIstDay(today), now), countsBetween(db, startOfIstDay(daysBefore(today, 1)), hoursBefore(now, 24))])
    return { from: today, to: today, current, before }
  }
  const days = periodDays[period]
  const [current, before] = await Promise.all([
    countsOfDays(db, daysBefore(today, days), daysBefore(today, 1)), countsOfDays(db, daysBefore(today, 2 * days), daysBefore(today, days + 1)),
  ])
  return { from: daysBefore(today, days), to: daysBefore(today, 1), current, before }
}

const pairOf = (current: EventCount[], before: EventCount[], event: string, split?: string, value?: string) =>
  ({ now: totalOf(current, event, split, value), before: totalOf(before, event, split, value) })

/** The funnel and the side cards of a period. No numbers when the analytics database is not set, fails, or is slow. */
export async function productNumbers(analyticsDb: AnalyticsDb | undefined, period: NumberPeriod, now: Date, log: FastifyBaseLogger): Promise<ProductNumbersResponse> {
  const today = istDateOf(now)
  const counts = analyticsDb ? await bestEffort(() => countsOf(analyticsDb, period, now), log, 'numbers') : null
  if (!counts) return { period, from: period === 'today' ? today : daysBefore(today, periodDays[period]), to: period === 'today' ? today : daysBefore(today, 1), numbers: null }
  const { from, to, current, before } = counts
  return {
    period, from, to,
    numbers: {
      steps: funnelSteps.map((step) => ({ step, ...pairOf(current, before, stepEvents[step]) })),
      newAccounts: pairOf(current, before, 'signed_in', 'newAccount', 'true'),
      foundOnRoomsie: pairOf(current, before, 'goal_closed', 'where', 'roomsie'),
      where: splitOf(current, 'goal_closed', 'where'), limits: splitOf(current, 'limit_hit', 'limit'),
      reports: splitOf(current, 'report_filed', 'reason'), answers: splitOf(current, 'slot_conflict', 'slot'),
    },
  }
}

/** The card of the home: the chats, the new accounts and the connect requests of today, against yesterday until the same time. */
export async function productCard(analyticsDb: AnalyticsDb | undefined, now: Date, log: FastifyBaseLogger): Promise<AdminHomeCard> {
  const { numbers } = await productNumbers(analyticsDb, 'today', now, log)
  const pairOfStep = (name: FunnelStep) => { const { now: count, before } = numbers!.steps.find((s) => s.step === name)!; return { now: count, before } }
  return { subject: 'product_numbers', today: numbers && { chats: pairOfStep('chats'), newAccounts: numbers.newAccounts, requests: pairOfStep('requests') } }
}
