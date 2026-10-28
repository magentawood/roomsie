import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { createTestAnalyticsDb } from './db'

let analytics: Awaited<ReturnType<typeof createTestAnalyticsDb>>
beforeAll(async () => { analytics = await createTestAnalyticsDb() })
afterAll(() => analytics.drop())

/** The first day of the month that is `offset` months from this month, in UTC. */
function month(offset: number) {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))
}
const nameOf = (start: Date) => `events_${start.getUTCFullYear()}_${String(start.getUTCMonth() + 1).padStart(2, '0')}`

async function partitions() {
  const rows = await analytics.db.execute<{ name: string; rls: boolean }>(sql`
    select c.relname as name, c.relrowsecurity as rls from pg_inherits i join pg_class c on c.oid = i.inhrelid
    where i.inhparent = 'public.events'::regclass order by c.relname`)
  return [...rows]
}
const maintain = () => analytics.db.execute(sql`select jobs.maintain_events(12)`)
async function addPartition(start: Date) {
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
  await analytics.db.execute(sql.raw(`create table ${nameOf(start)} partition of events for values from ('${start.toISOString()}') to ('${end.toISOString()}')`))
}

describe('jobs.maintain_events', () => {
  it('makes each missing monthly table to 12 months ahead, with row level security', async () => {
    const last = nameOf(month(12))
    await analytics.db.execute(sql.raw(`drop table ${last}`))
    await maintain()
    expect(await partitions()).toContainEqual({ name: last, rls: true })
    expect(await partitions()).not.toContainEqual(expect.objectContaining({ name: nameOf(month(13)) }))
  })

  it('drops a table whose whole month is older than the period, and keeps a table that is partly inside', async () => {
    await addPartition(month(-13))
    await addPartition(month(-12))
    await analytics.db.execute(sql`insert into events (id, name, event_version, fields, created_at) values (gen_random_uuid(), 'wall_hit', 1, '{}', ${month(-13).toISOString()})`)
    await maintain()
    const names = (await partitions()).map((p) => p.name)
    expect(names).not.toContain(nameOf(month(-13)))
    expect(names).toContain(nameOf(month(-12)))
  })

  it('changes nothing in a second run', async () => {
    await maintain()
    const before = await partitions()
    await maintain()
    expect(await partitions()).toEqual(before)
  })
})
