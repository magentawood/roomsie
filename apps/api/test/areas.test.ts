import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { areasResponse } from '@roomsie/contract'
import { createTestDb, type TestDb } from './db'
import { offlineStorage, routesOnlyOptions } from '../scripts/openapi'
import { seedCatalogues } from '../src/db/seed-axes'
import { areas } from '../src/db/schema'
import { buildServer } from '../src/server'

let testDb: TestDb
let app: ReturnType<typeof buildServer>

beforeAll(async () => {
  testDb = await createTestDb()
  app = buildServer({ ...routesOnlyOptions, db: testDb.db, storage: offlineStorage })
})
afterAll(async () => {
  await app.close()
  await testDb.drop()
})

describe('GET /v1/areas', () => {
  it('lists the nine area groups of PD2 in order, with no sign-in', async () => {
    await seedCatalogues(testDb.db)
    const res = await app.inject({ method: 'GET', url: '/v1/areas' })
    expect(res.statusCode).toBe(200)
    const { areas: list } = areasResponse.parse(res.json())
    expect(list.map((a) => a.name)).toEqual([
      'Andheri–Goregaon', 'Bandra–Santacruz', 'Powai–Vikhroli', 'Lower Parel–Worli', 'South Mumbai',
      'Malad–Borivali', 'Chembur–Ghatkopar', 'Thane', 'Navi Mumbai',
    ])
    expect(list.every((a) => !a.isLaunchArea)).toBe(true)
  })

  it('keeps the launch flag that F-06 sets when the seed runs again', async () => {
    await seedCatalogues(testDb.db)
    await testDb.db.update(areas).set({ isLaunchArea: true }).where(eq(areas.slug, 'powai-vikhroli'))
    await seedCatalogues(testDb.db)
    const { areas: list } = areasResponse.parse((await app.inject({ method: 'GET', url: '/v1/areas' })).json())
    expect(list.filter((a) => a.isLaunchArea).map((a) => a.slug)).toEqual(['powai-vikhroli'])
  })
})
