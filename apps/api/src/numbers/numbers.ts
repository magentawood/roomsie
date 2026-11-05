import type { FastifyBaseLogger } from 'fastify'
import { funnelSteps, type AdminHomeCard, type AnalyticsEvent, type FunnelStep, type NumberPeriod, type ProductNumbersResponse } from '@roomsie/contract'
import type { AnalyticsDb } from '../analytics/client'
import { bestEffort, countsBetween, countsOfDays, type EventCount } from '../analytics/read'
import { daysBefore, hoursBefore, istDateOf, startOfIstDay } from '../time'

const stepEvents: Record<FunnelStep, AnalyticsEvent['name']> = {
  chats: 'interview_started', results: 'results_shown', wall: 'wall_hit', signedIn: 'signed_in', requests: 'connect_sent', accepted: 'connect_accepted', closed: 'goal_closed',
}
const periodDays: Record<NumberPeriod, number> = { today: 0, week: 7, month: 30 }
type Counts = { current: EventCount[]; before: EventCount[] }

const totalOf = (counts: EventCount[], event: AnalyticsEvent['name'], split = '', value = '') =>
  counts.find((c) => c.event === event && c.split === split && c.value === value)?.total ?? 0
const pairOf = ({ current, before }: Counts, event: AnalyticsEvent['name'], split?: string, value?: string) =>
  ({ now: totalOf(current, event, split, value), before: totalOf(before, event, split, value) })
const splitOf = ({ current }: Counts, event: AnalyticsEvent['name'], split: string) =>
  current.filter((c) => c.event === event && c.split === split).map(({ value, total }) => ({ value, count: total }))
    .toSorted((a, b) => b.count - a.count || a.value.localeCompare(b.value))

/**
 * The counts of a period and of the period before it (T-66): today and yesterday until the same time from the raw events
 * (the exception of database.md), and the whole days from the rollup. No counts when the analytics database is not set, fails or is slow.
 */
async function countsOf(analyticsDb: AnalyticsDb | undefined, period: NumberPeriod, now: Date, log: FastifyBaseLogger) {
  const today = istDateOf(now)
  const days = periodDays[period]
  const [from, to] = period === 'today' ? [today, today] : [daysBefore(today, days), daysBefore(today, 1)]
  const read = async (db: AnalyticsDb): Promise<Counts> => {
    const [current, before] = await Promise.all(period === 'today'
      ? [countsBetween(db, startOfIstDay(today), now), countsBetween(db, startOfIstDay(daysBefore(today, 1)), hoursBefore(now, 24))]
      : [countsOfDays(db, from, to), countsOfDays(db, daysBefore(from, days), daysBefore(to, days))])
    return { current, before }
  }
  return { from, to, counts: analyticsDb ? await bestEffort(() => read(analyticsDb), log, 'numbers') : null }
}

/** The funnel and the side cards of a period, against the period before. */
export async function productNumbers(analyticsDb: AnalyticsDb | undefined, period: NumberPeriod, now: Date, log: FastifyBaseLogger): Promise<ProductNumbersResponse> {
  const { from, to, counts } = await countsOf(analyticsDb, period, now, log)
  return {
    period, from, to,
    numbers: counts && {
      steps: funnelSteps.map((step) => ({ step, ...pairOf(counts, stepEvents[step]) })),
      newAccounts: pairOf(counts, 'signed_in', 'newAccount', 'true'),
      where: splitOf(counts, 'goal_closed', 'where'), limits: splitOf(counts, 'limit_hit', 'limit'),
      reports: splitOf(counts, 'report_filed', 'reason'), answers: splitOf(counts, 'slot_conflict', 'slot'),
    },
  }
}

export async function productCard(analyticsDb: AnalyticsDb | undefined, now: Date, log: FastifyBaseLogger): Promise<AdminHomeCard> {
  const { counts } = await countsOf(analyticsDb, 'today', now, log)
  return {
    subject: 'product_numbers',
    today: counts && { chats: pairOf(counts, stepEvents.chats), newAccounts: pairOf(counts, 'signed_in', 'newAccount', 'true'), requests: pairOf(counts, stepEvents.requests) },
  }
}
