import { afterAll, beforeAll, expect, it } from 'vitest'
import { createTestDb } from './db'

let testDb: Awaited<ReturnType<typeof createTestDb>>

beforeAll(async () => {
  testDb = await createTestDb()
})
afterAll(() => testDb.drop())

it('runs queries against a disposable Postgres 17 database', async () => {
  const [row] = await testDb.client`select current_setting('server_version_num')::int as version`
  expect(row!.version).toBeGreaterThanOrEqual(170000)
})
