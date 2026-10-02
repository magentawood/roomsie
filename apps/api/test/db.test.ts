import { afterAll, beforeAll, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { createTestDb, type TestDb } from './db'

let testDb: TestDb

beforeAll(async () => {
  testDb = await createTestDb()
})
afterAll(() => testDb.drop())

it('runs queries against a disposable Postgres 17 database', async () => {
  const [row] = await testDb.db.execute<{ version: number }>(sql`select current_setting('server_version_num')::int as version`)
  expect(row!.version).toBeGreaterThanOrEqual(170000)
})
