import { and, eq, gte, sql } from 'drizzle-orm'
import type { ModelRole } from '@roomsie/contract'
import type { AnalyticsDb } from './client'
import { events } from './schema'

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
