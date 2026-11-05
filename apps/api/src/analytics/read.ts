import { and, between, eq, gte, sql, sum } from 'drizzle-orm'
import type { FastifyBaseLogger } from 'fastify'
import type { ModelRole } from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'
import type { AnalyticsDb } from './client'
import { eventDays, events } from './schema'

/** A slow or failed analytics read gives no numbers; the page and the other cards still show. */
export async function bestEffort<T>(read: () => Promise<T>, log: FastifyBaseLogger, where: string): Promise<T | null> {
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('the analytics read took over 5 s')), 5_000).unref())
  return Promise.race([Promise.resolve().then(read), timeout]).catch((err: unknown) => {
    reportError(err, { where, log })
    return null
  })
}

// A literal key, not a parameter, so the same field in the select and in the group by is one expression.
const field = (name: 'role' | 'model' | 'outcome' | 'fallback' | 'ms' | 'tokensIn' | 'cachedTokensIn' | 'tokensOut' | 'band') => sql`${events.fields}->>${sql.raw(`'${name}'`)}`
// The live check of the keys is no call of the assistant.
const calledSince = (since: Date) => and(eq(events.name, 'model_called'), gte(events.createdAt, since), sql`${field('role')} <> ${'check' satisfies ModelRole}`)

/** The model calls since a time, by role and for all (the null role, always a row), with the slowest 5% (T-65). */
export const callStats = (db: AnalyticsDb, since: Date) => db.select({
  role: sql<string | null>`${field('role')}`,
  calls: sql<number>`count(*)`.mapWith(Number),
  failedShare: sql<number>`coalesce(avg((${field('outcome')} <> 'ok')::int), 0)`.mapWith(Number),
  fallbackShare: sql<number>`coalesce(avg((${field('fallback')})::boolean::int), 0)`.mapWith(Number),
  p95Ms: sql<number | null>`percentile_disc(0.95) within group (order by (${field('ms')})::int)`,
}).from(events).where(calledSince(since)).groupBy(sql`grouping sets ((${field('role')}), ())`)

/** The tokens of each role and model since a time: the spend comes from them. */
export const tokenSums = (db: AnalyticsDb, since: Date) => db.select({
  role: sql<string>`${field('role')}`,
  model: sql<string>`${field('model')}`,
  tokensIn: sql<number>`sum((${field('tokensIn')})::bigint)`.mapWith(Number),
  cachedTokensIn: sql<number>`sum((${field('cachedTokensIn')})::bigint)`.mapWith(Number),
  tokensOut: sql<number>`sum((${field('tokensOut')})::bigint)`.mapWith(Number),
}).from(events).where(calledSince(since)).groupBy(field('role'), field('model'))

/** The typed turns of each band of the router since a time. */
export const bandCounts = (db: AnalyticsDb, since: Date) => db.select({ band: sql<string>`${field('band')}`, turns: sql<number>`count(*)`.mapWith(Number) })
  .from(events).where(and(eq(events.name, 'turn_routed'), gte(events.createdAt, since))).groupBy(field('band'))

/** A count of the product numbers: all the events of a name (`field` ''), or the events of one value of a field (T-66). */
export type EventCount = { name: string; field: string; value: string; count: number }

/** The counts of a time range, from the raw events. */
export const countsBetween = async (db: AnalyticsDb, since: Date, until: Date) =>
  [...await db.execute<EventCount>(sql`select * from jobs.count_events(${since.toISOString()}::timestamptz, ${until.toISOString()}::timestamptz)`)]

/** The counts of whole days in IST, from the rollup of the nightly job. */
export const countsOfDays = (db: AnalyticsDb, first: string, last: string) => db.select({
  name: eventDays.name, field: eventDays.field, value: eventDays.value, count: sum(eventDays.count).mapWith(Number),
}).from(eventDays).where(between(eventDays.day, first, last)).groupBy(eventDays.name, eventDays.field, eventDays.value)

