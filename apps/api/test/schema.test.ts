import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './db'
import { eq } from 'drizzle-orm'
import { anonymousSessions, areas, chatTurns, goals, lifestyleAxes, listingRates, listings, mustHaves, profileMustHaves, profiles, users } from '../src/db/schema'
import { seedCatalogues } from '../src/db/seed-axes'

let testDb: TestDb

beforeAll(async () => {
  testDb = await createTestDb()
})
afterAll(() => testDb.drop())

const newUser = async () => {
  const [user] = await testDb.db.insert(users).values({ authProviderId: crypto.randomUUID() }).returning()
  return user!
}

const newSession = async () => {
  const [session] = await testDb.db.insert(anonymousSessions)
    .values({ deviceHash: 'device', expiresAt: new Date(Date.now() + 86_400_000) })
    .returning()
  return session!
}

describe('profiles', () => {
  it('accepts an empty age and an age of 18, and rejects 17', async () => {
    const user = await newUser()
    await expect(testDb.db.insert(profiles).values({ userId: user.id, fullName: 'Asha' })).resolves.toBeDefined()
    await expect(testDb.db.insert(profiles).values({ userId: (await newUser()).id, fullName: 'Ravi', age: 18 })).resolves.toBeDefined()
    await expect(testDb.db.insert(profiles).values({ userId: (await newUser()).id, fullName: 'Kid', age: 17 })).rejects.toThrow()
  })

  it('accepts four photos and rejects a fifth', async () => {
    const photoKeys = ['a', 'b', 'c', 'd']
    await expect(testDb.db.insert(profiles).values({ userId: (await newUser()).id, fullName: 'Meera', photoKeys })).resolves.toBeDefined()
    await expect(testDb.db.insert(profiles).values({ userId: (await newUser()).id, fullName: 'Meera', photoKeys: [...photoKeys, 'e'] })).rejects.toThrow()
  })
})

describe('goals', () => {
  it('belongs to exactly one owner: a visitor session or a user', async () => {
    const user = await newUser()
    const session = await newSession()
    await expect(testDb.db.insert(goals).values({ userId: user.id })).resolves.toBeDefined()
    await expect(testDb.db.insert(goals).values({ anonymousSessionId: session.id })).resolves.toBeDefined()
    await expect(testDb.db.insert(goals).values({})).rejects.toThrow()
    await expect(testDb.db.insert(goals).values({ userId: user.id, anonymousSessionId: session.id })).rejects.toThrow()
  })
})

describe('chat turns', () => {
  it('records how a user turn came in, and never for an assistant turn', async () => {
    const [goal] = await testDb.db.insert(goals).values({ userId: (await newUser()).id }).returning()
    const goalId = goal!.id
    await expect(testDb.db.insert(chatTurns).values({ goalId, role: 'user', input: 'typed', text: '2bhk in powai' })).resolves.toBeDefined()
    await expect(testDb.db.insert(chatTurns).values({ goalId, role: 'assistant', text: 'Found 24 rooms', parts: { cards: [] } })).resolves.toBeDefined()
    await expect(testDb.db.insert(chatTurns).values({ goalId, role: 'user', text: 'no input kind' })).rejects.toThrow()
    await expect(testDb.db.insert(chatTurns).values({ goalId, role: 'assistant', input: 'chip', text: 'wrong' })).rejects.toThrow()
  })
})

describe('catalogues', () => {
  it('seeds the eight lifestyle questions and the seven must-haves, with the gender pair off', async () => {
    await seedCatalogues(testDb.db)
    await seedCatalogues(testDb.db)
    const axes = await testDb.db.select().from(lifestyleAxes)
    expect(axes.map((a) => a.key).sort()).toEqual(['drinks', 'food', 'guests', 'pets', 'sleep', 'smoking', 'tidiness', 'your_days'])
    const active = await testDb.db.select().from(mustHaves).where(eq(mustHaves.active, true))
    const all = await testDb.db.select().from(mustHaves)
    expect(all).toHaveLength(7)
    expect(active.map((m) => m.key)).not.toContain('women_only')
    expect(active.map((m) => m.key)).not.toContain('men_only')
  })

  it('keeps a weight for each must-have of a profile, and rejects an unknown must-have', async () => {
    await seedCatalogues(testDb.db)
    const [profile] = await testDb.db.insert(profiles).values({ userId: (await newUser()).id, fullName: 'Kabir' }).returning()
    await expect(testDb.db.insert(profileMustHaves).values({ profileId: profile!.id, mustHaveKey: 'non_smokers', weight: 'dealbreaker' })).resolves.toBeDefined()
    await expect(testDb.db.insert(profileMustHaves).values({ profileId: profile!.id, mustHaveKey: 'no_such_thing', weight: 'prefer' })).rejects.toThrow()
  })
})

describe('listings', () => {
  const area = 'powai-vikhroli'
  beforeAll(async () => {
    await testDb.db.insert(areas).values({ slug: area, name: 'Powai–Vikhroli' })
  })

  it('lets a draft stay incomplete, and needs an area to go live', async () => {
    const ownerUserId = (await newUser()).id
    await expect(testDb.db.insert(listings).values({ ownerUserId, kind: 'owner_flat' })).resolves.toBeDefined()
    await expect(testDb.db.insert(listings).values({ ownerUserId, kind: 'owner_flat', status: 'live' })).rejects.toThrow()
    await expect(testDb.db.insert(listings).values({ ownerUserId, kind: 'owner_flat', status: 'live', areaSlug: area })).resolves.toBeDefined()
  })

  it('needs a PG name for a live PG, and a brokerage for a live broker flat', async () => {
    const ownerUserId = (await newUser()).id
    await expect(testDb.db.insert(listings).values({ ownerUserId, kind: 'pg', status: 'live', areaSlug: area })).rejects.toThrow()
    await expect(testDb.db.insert(listings).values({ ownerUserId, kind: 'pg', status: 'live', areaSlug: area, pgName: 'Shivraj PG' })).resolves.toBeDefined()
    await expect(testDb.db.insert(listings).values({ ownerUserId, kind: 'broker_flat', status: 'live', areaSlug: area })).rejects.toThrow()
    await expect(testDb.db.insert(listings).values({ ownerUserId, kind: 'broker_flat', status: 'live', areaSlug: area, brokerage: 15000 })).resolves.toBeDefined()
  })

  it('accepts five photos and rejects a sixth', async () => {
    const ownerUserId = (await newUser()).id
    const photoKeys = ['a', 'b', 'c', 'd', 'e']
    await expect(testDb.db.insert(listings).values({ ownerUserId, kind: 'room_in_flat', photoKeys })).resolves.toBeDefined()
    await expect(testDb.db.insert(listings).values({ ownerUserId, kind: 'room_in_flat', photoKeys: [...photoKeys, 'f'] })).rejects.toThrow()
  })

  it('has one rent without a sharing type, or one rent for each sharing type of a PG', async () => {
    const ownerUserId = (await newUser()).id
    const [flat] = await testDb.db.insert(listings).values({ ownerUserId, kind: 'owner_flat' }).returning()
    await expect(testDb.db.insert(listingRates).values({ listingId: flat!.id, rent: 25000, deposit: 50000 })).resolves.toBeDefined()
    await expect(testDb.db.insert(listingRates).values({ listingId: flat!.id, rent: 26000 })).rejects.toThrow()
    const [pg] = await testDb.db.insert(listings).values({ ownerUserId, kind: 'pg' }).returning()
    await expect(testDb.db.insert(listingRates).values([
      { listingId: pg!.id, sharing: 'single', rent: 18000 },
      { listingId: pg!.id, sharing: 'double', rent: 12000 },
    ])).resolves.toBeDefined()
  })
})
