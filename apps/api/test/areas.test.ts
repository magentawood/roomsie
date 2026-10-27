import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { areasResponse } from '@roomsie/contract'
import { createTestDb, type TestDb } from './db'
import { offlineStorage, routesOnlyOptions } from '../scripts/openapi'
import { matchingAreas } from '../src/areas'
import { seedCatalogues } from '../src/db/seed-axes'
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
  it('lists the ten area groups of PD2 in order, each followed by its sub-areas and pockets, with no sign-in', async () => {
    await seedCatalogues(testDb.db)
    const res = await app.inject({ method: 'GET', url: '/v1/areas' })
    expect(res.statusCode).toBe(200)
    const { areas: list } = areasResponse.parse(res.json())
    const parentOf = new Map(list.map((a) => [a.slug, a.parent]))
    const level = (slug: string): number => { const parent = parentOf.get(slug); return parent ? 1 + level(parent) : 0 }
    expect(list.filter((a) => level(a.slug) === 0).map((a) => a.name)).toEqual([
      'Andheri–Goregaon', 'Bandra–Santacruz', 'Powai–Vikhroli', 'Lower Parel–Worli', 'Dadar–Sion',
      'South Mumbai', 'Malad–Borivali', 'Chembur–Ghatkopar', 'Thane', 'Navi Mumbai',
    ])
    expect(list.filter((a) => level(a.slug) === 1)).toHaveLength(90)
    expect(list.filter((a) => level(a.slug) === 2)).toHaveLength(19)
    expect(list.length).toBe(119)
    expect(list.slice(0, 4).map((a) => [a.slug, a.parent])).toEqual([
      ['andheri-goregaon', null], ['andheri-west', 'andheri-goregaon'], ['lokhandwala', 'andheri-west'], ['versova', 'andheri-west'],
    ])
    expect(list.filter((a) => a.parent === 'thane-west')).toHaveLength(11)
    expect(list.find((a) => a.slug === 'kandivali-east')!.aliases).toContain('Kandivli')
    expect(list.every((a) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug))).toBe(true)
  })
})

describe('the areas that match a pick', () => {
  const parentOf = new Map([
    ['andheri-goregaon', null], ['andheri-west', 'andheri-goregaon'], ['versova', 'andheri-west'], ['lokhandwala', 'andheri-west'],
    ['andheri-east', 'andheri-goregaon'], ['thane', null], ['thane-west', 'thane'],
  ])

  it('includes the areas under a group and under a sub-area', () => {
    expect(matchingAreas(parentOf, ['andheri-goregaon'])).toEqual(['andheri-goregaon', 'andheri-west', 'versova', 'lokhandwala', 'andheri-east'])
    expect(matchingAreas(parentOf, ['andheri-west'])).toEqual(['andheri-goregaon', 'andheri-west', 'versova', 'lokhandwala'])
  })

  it('matches a pocket with the areas above it, and not with the pocket next to it', () => {
    expect(matchingAreas(parentOf, ['versova'])).toEqual(['andheri-goregaon', 'andheri-west', 'versova'])
    expect(matchingAreas(parentOf, ['versova', 'thane'])).toEqual(['andheri-goregaon', 'andheri-west', 'versova', 'thane', 'thane-west'])
  })
})
