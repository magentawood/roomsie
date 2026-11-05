import type { FastifyBaseLogger } from 'fastify'
import { funnelSteps, type AdminHomeCard, type AnalyticsEvent, type FunnelStep, type NumberPeriod, type ProductNumbersResponse } from '@roomsie/contract'
import type { AnalyticsDb } from '../analytics/client'
import { bestEffort, countsBetween, countsOfDays, type EventCount } from '../analytics/read'
import { daysBefore, hoursBefore, istDateOf, startOfIstDay } from '../time'

const stepEvents: Record<FunnelStep, AnalyticsEvent['name']> = {
  chats: 'interview_started', results: 'results_shown', wall: 'wall_hit', signedIn: 'signed_in', requests: 'connect_sent', accepted: 'connect_accepted', closed: 'goal_closed',
}
const periodDays = { week: 7, month: 30 }
type Counts = { current: EventCount[]; before: EventCount[] }

const countOf = (counts: EventCount[], name: AnalyticsEvent['name'], field = '', value = '') =>
  counts.find((c) => c.name === name && c.field === field && c.value === value)?.count ?? 0
const pairOf = ({ current, before }: Counts, name: AnalyticsEvent['name'], field?: string, value?: string) =>
  ({ now: countOf(current, name, field, value), before: countOf(before, name, field, value) })
const newAccountsOf = (counts: Counts) => pairOf(counts, 'signed_in', 'newAccount', 'true')
const splitOf = ({ current }: Counts, name: AnalyticsEvent['name'], field: string) =>
  current.filter((c) => c.name === name && c.field === field).map(({ value, count }) => ({ value, count }))
    .toSorted((a, b) => b.count - a.count || a.value.localeCompare(b.value))

/** Today reads the raw events (the exception of database.md); whole days read the rollup. */
async function countsOf(analyticsDb: AnalyticsDb | undefined, period: NumberPeriod, now: Date, log: FastifyBaseLogger) {
  const today = istDateOf(now)
  const [from, to] = period === 'today' ? [today, today] : [daysBefore(today, periodDays[period]), daysBefore(today, 1)]
  const read = async (db: AnalyticsDb): Promise<Counts> => {
    const [current, before] = await Promise.all(period === 'today'
      ? [countsBetween(db, startOfIstDay(today), now), countsBetween(db, startOfIstDay(daysBefore(today, 1)), hoursBefore(now, 24))]
      : [countsOfDays(db, from, to), countsOfDays(db, daysBefore(from, periodDays[period]), daysBefore(to, periodDays[period]))])
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
      newAccounts: newAccountsOf(counts),
      where: splitOf(counts, 'goal_closed', 'where'), limits: splitOf(counts, 'limit_hit', 'limit'),
      reports: splitOf(counts, 'report_filed', 'reason'), answers: splitOf(counts, 'slot_conflict', 'slot'),
    },
  }
}

export async function productCard(analyticsDb: AnalyticsDb | undefined, now: Date, log: FastifyBaseLogger): Promise<AdminHomeCard> {
  const { counts } = await countsOf(analyticsDb, 'today', now, log)
  return {
    subject: 'product_numbers',
    today: counts && { chats: pairOf(counts, stepEvents.chats), newAccounts: newAccountsOf(counts), requests: pairOf(counts, stepEvents.requests) },
  }
}
