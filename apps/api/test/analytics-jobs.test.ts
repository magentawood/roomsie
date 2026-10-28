import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { createTestAnalyticsDb } from './db'

let analytics: Awaited<ReturnType<typeof createTestAnalyticsDb>>
beforeAll(async () => { analytics = await createTestAnalyticsDb() })
afterAll(() => analytics.drop())

const now = new Date()
const monthStart = (offset: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))
const partitionName = (offset: number) => `events_${monthStart(offset).toISOString().slice(0, 7).replace('-', '_')}`

async function partitions() {
  const rows = await analytics.db.execute<{ name: string; rls: boolean }>(sql`
    select c.relname as name, c.relrowsecurity as rls from pg_inherits i join pg_class c on c.oid = i.inhrelid
    where i.inhparent = 'public.events'::regclass order by c.relname`)
  return [...rows]
}
const maintain = () => analytics.db.execute(sql`select jobs.maintain_events(12)`)
const addPartition = (offset: number) => analytics.db.execute(sql.raw(
  `create table ${partitionName(offset)} partition of events for values from ('${monthStart(offset).toISOString()}') to ('${monthStart(offset + 1).toISOString()}')`))

describe('jobs.maintain_events', () => {
  it('makes each missing monthly table to 12 months ahead, with row level security', async () => {
    const last = partitionName(12)
    await analytics.db.execute(sql.raw(`drop table ${last}`))
    await maintain()
    expect(await partitions()).toContainEqual({ name: last, rls: true })
    expect(await partitions()).not.toContainEqual(expect.objectContaining({ name: partitionName(13) }))
  })

  it('drops a table whose whole month is older than the period, and keeps a table that is partly inside', async () => {
    await addPartition(-13)
    await addPartition(-12)
    await maintain()
    const names = (await partitions()).map((p) => p.name)
    expect(names).not.toContain(partitionName(-13))
    expect(names).toContain(partitionName(-12))
  })

  it('changes nothing in a second run', async () => {
    await maintain()
    const before = await partitions()
    await maintain()
    expect(await partitions()).toEqual(before)
  })
})
