import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq, inArray } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { profiles, users } from '../src/db/schema'
import { seedCatalogues } from '../src/db/seed-axes'
import { findMatches, type FormA } from '../src/profiles/match'
import { testApp, type TestApp } from './app'

type Who = 'seeker' | 'match' | 'partial' | 'pocket' | 'smoker' | 'blocked' | 'suspended' | 'far'
let t: TestApp<Who>
const cards = {} as Record<Who, string>

beforeAll(async () => {
  t = await testApp(['seeker', 'match', 'partial', 'pocket', 'smoker', 'blocked', 'suspended', 'far'])
  await seedCatalogues(t.db)
  const lifestyle: Record<Who, object> = {
    seeker: { smoking: 'non_smoker' },
    match: { smoking: 'non_smoker', food: 'veg' },
    partial: { smoking: 'non_smoker', food: 'non_veg' },
    pocket: { smoking: 'non_smoker', food: 'veg' },
    smoker: { smoking: 'smoker', food: 'veg' },
    blocked: { smoking: 'non_smoker', food: 'veg' },
    suspended: { smoking: 'non_smoker', food: 'veg' },
    far: { smoking: 'non_smoker', food: 'veg' },
  }
  for (const who of Object.keys(lifestyle) as Who[]) {
    cards[who] = await t.liveCard(who, `Card ${who}`)
    expect((await t.call(who, 'PATCH', '/v1/me/profile', { lifestyle: lifestyle[who] })).statusCode).toBe(200)
  }
  expect((await t.call('pocket', 'PATCH', '/v1/me/profile', { areas: ['pali-hill'] })).statusCode).toBe(200)
  expect((await t.call('far', 'PATCH', '/v1/me/profile', { areas: ['bandra-santacruz'] })).statusCode).toBe(200)
  expect((await t.call('seeker', 'POST', '/v1/blocks', { id: uuidv7(), profileId: cards.blocked })).statusCode).toBe(204)
  await t.db.update(users).set({ status: 'suspended' }).where(eq(users.id, t.ids.suspended))
  // No route sets the intent yet (T-08).
  await t.db.update(profiles).set({ intent: 'flatmates' }).where(inArray(profiles.id, Object.values(cards)))
})
afterAll(() => t.close())

const form = (change: Partial<FormA> = {}): FormA => ({
  intent: 'flatmates',
  areas: ['pali-hill'],
  budgetMax: 25000,
  lifestyle: [
    { axisKey: 'smoking', value: 'non_smoker', weight: 'dealbreaker' },
    { axisKey: 'food', value: 'veg', weight: 'prefer' },
  ],
  ...change,
})
const matches = (change?: Partial<FormA>) => findMatches(t.db, form(change), { viewerUserId: t.ids.seeker })
const names = async (change?: Partial<FormA>) => (await matches(change)).rows.map((r) => r.displayName).sort()

describe('the match query', () => {
  it('finds the people in an area, the areas under it and the areas above it, with a score for the preference', async () => {
    const result = await matches()
    expect(result).toMatchObject({ resultsUnlocked: true, scoreShown: true, total: 4 })
    expect(result.rows.map((r) => [r.displayName, r.score]).sort()).toEqual([
      ['Card far', 100], ['Card match', 100], ['Card partial', 70], ['Card pocket', 100],
    ])
    expect(result.rows.at(-1)).toMatchObject({ displayName: 'Card partial', areas: ['bandra'], budgetMax: 20000 })
  })

  it('leaves out a violated dealbreaker, a block in either direction, a suspended person and the viewer', async () => {
    const found = await names()
    for (const who of ['smoker', 'blocked', 'suspended', 'seeker'] as const) expect(found).not.toContain(`Card ${who}`)
    const asBlocked = (await findMatches(t.db, form(), { viewerUserId: t.ids.blocked })).rows.map((r) => r.displayName)
    expect(asBlocked).not.toContain('Card seeker')
  })

  it('gives no score and the newest first with no preference', async () => {
    const result = await matches({ lifestyle: [] })
    expect(result.scoreShown).toBe(false)
    expect(result.rows.every((r) => r.score === null)).toBe(true)
    expect(result.rows.map((r) => r.displayName)).toEqual(['Card far', 'Card smoker', 'Card pocket', 'Card partial', 'Card match'])
  })

  it('finds a pocket in its sub-area and a person who picked the whole group', async () => {
    expect(await names({ areas: ['bandra'] })).toEqual(['Card far', 'Card match', 'Card partial', 'Card pocket'])
  })

  it('gives no rows, and no error, for an area that matches no area, and for an intent that matches no person', async () => {
    expect((await matches({ areas: ['nowhere'] })).rows).toEqual([])
    for (const intent of ['room', 'pg', 'whole_flat'] as const) expect((await matches({ intent })).rows).toEqual([])
  })

  it('filters on the budget', async () => {
    expect(await names({ budgetMin: 21000, budgetMax: undefined })).toEqual([])
  })
})
