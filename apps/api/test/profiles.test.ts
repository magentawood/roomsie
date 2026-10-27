import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { cardResponse, listingResponse, profileResponse, profileUploadUrlResponse } from '@roomsie/contract'
import { blocks, profiles, users } from '../src/db/schema'
import { seedCatalogues } from '../src/db/seed-axes'
import type { Storage } from '../src/storage'
import { offlineStorage } from '../scripts/openapi'
import { testApp, type TestApp } from './app'

type Who = 'lister' | 'seeker' | 'parent' | 'newcomer'
const deleted: string[] = []
let r2Down = false
const storage: Storage = {
  ...offlineStorage,
  async deleteObjects(keys) {
    if (r2Down) throw new Error('R2 is down')
    deleted.push(...keys)
  },
}
let t: TestApp<Who>
beforeAll(async () => {
  t = await testApp(['lister', 'seeker', 'parent', 'newcomer'], storage)
  await seedCatalogues(t.db)
})
afterAll(() => t.close())
beforeEach(() => { deleted.length = 0; r2Down = false })

const create = (who: Who, body: object = { fullName: 'Divya Sharma', age: 24, gender: 'female' }) => t.call(who, 'POST', '/v1/me/profile', body)
const edit = (who: Who, body: object) => t.call(who, 'PATCH', '/v1/me/profile', body)
const own = async (who: Who) => profileResponse.parse((await t.call(who, 'GET', '/v1/me/profile')).json())
const complete = { whosMoving: 'working', areas: ['bandra'], budgetMax: 20000 }
const photoKey = (profileId: string, n: number) => `profiles/${profileId}/0199e4b0-0000-7000-8000-00000000000${n}.jpg`

describe('the own profile', () => {
  it('makes one profile with the name, the age and the gender, and lists what the card still needs', async () => {
    expect((await t.call('lister', 'GET', '/v1/me/profile')).statusCode).toBe(404)
    expect((await create('lister', { fullName: 'Shruti Rao', age: 17, gender: 'female' })).statusCode).toBe(400)
    expect((await create('lister', { fullName: 'Shruti Rao', age: 30 })).statusCode).toBe(400)
    expect((await t.call(null, 'POST', '/v1/me/profile', { fullName: 'Shruti Rao', age: 30, gender: 'female' })).statusCode).toBe(401)
    const made = await create('lister', { fullName: 'Shruti Rao', age: 30, gender: 'female' })
    expect(made.statusCode).toBe(201)
    expect(profileResponse.parse(made.json())).toMatchObject({ fullName: 'Shruti Rao', gender: 'female', visibility: 'draft', missing: ['whosMoving', 'areas', 'budget'] })
    expect((await create('lister')).statusCode).toBe(409)
  })

  it('goes live when the card is complete, hides with "Hide my card", and goes back to a draft when a field is cleared', async () => {
    expect((await edit('lister', complete)).statusCode).toBe(200)
    expect(await own('lister')).toMatchObject({ visibility: 'live', missing: [] })
    expect(profileResponse.parse((await edit('lister', { hidden: true })).json()).visibility).toBe('hidden')
    expect(profileResponse.parse((await edit('lister', { bio: 'Early riser.' })).json()).visibility).toBe('hidden')
    expect(profileResponse.parse((await edit('lister', { hidden: false })).json()).visibility).toBe('live')
    expect(profileResponse.parse((await edit('lister', { areas: [] })).json())).toMatchObject({ visibility: 'draft', missing: ['areas'] })
    expect((await edit('lister', { areas: ['bandra'] })).statusCode).toBe(200)
  })

  it('counts a budget with only the lowest amount, as the band "Above ₹35k"', async () => {
    expect(profileResponse.parse((await edit('lister', { budgetMin: 35000, budgetMax: null })).json())).toMatchObject({ visibility: 'live', missing: [] })
    expect(profileResponse.parse((await edit('lister', { budgetMin: null })).json())).toMatchObject({ visibility: 'draft', missing: ['budget'] })
    expect((await edit('lister', { budgetMax: 20000 })).statusCode).toBe(200)
  })

  it('saves an area group, a sub-area and a pocket together, up to 20 areas', async () => {
    expect(profileResponse.parse((await edit('lister', { areas: ['bandra-santacruz', 'bandra', 'pali-hill'] })).json()).areas)
      .toEqual(['bandra-santacruz', 'bandra', 'pali-hill'])
    expect((await edit('lister', { areas: Array.from({ length: 21 }, (_, i) => `area-${i}`) })).statusCode).toBe(400)
    expect((await edit('lister', { areas: ['bandra'] })).statusCode).toBe(200)
  })

  it('refuses an unknown area, a budget the wrong way round, and an edit with no profile', async () => {
    expect((await edit('lister', { areas: ['pune'] })).statusCode).toBe(400)
    expect((await edit('lister', { budgetMin: 25000, budgetMax: 15000 })).statusCode).toBe(400)
    expect((await edit('newcomer', { bio: 'no profile yet' })).statusCode).toBe(404)
  })

  it('saves the lifestyle answers and the must-haves, and null clears one', async () => {
    const body = { lifestyle: { food: 'veg', smoking: 'non_smoker' }, mustHaves: { veg_kitchen: 'dealbreaker', tidy_flatmates: 'prefer' } }
    expect((await edit('lister', body)).statusCode).toBe(200)
    expect(await own('lister')).toMatchObject(body)
    const cleared = profileResponse.parse((await edit('lister', { lifestyle: { smoking: null }, mustHaves: { tidy_flatmates: null } })).json())
    expect(cleared.lifestyle).toEqual({ food: 'veg' })
    expect(cleared.mustHaves).toEqual({ veg_kitchen: 'dealbreaker' })
    expect((await edit('lister', { lifestyle: { food: 'fish' } })).statusCode).toBe(400)
    expect((await edit('lister', { mustHaves: { pool: 'prefer' } })).statusCode).toBe(400)
  })

  it('masks a phone number in the name, the bio, the job role and the commute address (PD17)', async () => {
    const saved = profileResponse.parse((await edit('lister', { bio: 'Call me on 98200 12345', jobRole: 'Analyst 9820012345', commuteAddress: 'BKC, ping 9820012345' })).json())
    for (const field of [saved.bio, saved.jobRole, saved.commuteAddress]) expect(field).not.toContain('9820')
    const made = profileResponse.parse((await create('seeker', { fullName: 'Ravi 9820012345', age: 26, gender: 'male' })).json())
    expect(made.fullName).not.toContain('9820')
    expect(profileResponse.parse((await edit('seeker', { fullName: 'Ravi 98200 12345' })).json()).fullName).not.toContain('9820')
  })
})

describe('a parent', () => {
  it('runs the card of a son or daughter, whose type is student, first job or working', async () => {
    expect((await create('parent', { fullName: 'Aarav Mehta', age: 19, gender: 'male' })).statusCode).toBe(201)
    expect((await edit('parent', { managedByParent: true, whosMoving: 'couple' })).statusCode).toBe(400)
    expect((await edit('parent', { managedByParent: true, whosMoving: 'student', areas: ['bandra'], budgetMax: 15000 })).statusCode).toBe(200)
    expect(await own('parent')).toMatchObject({ managedByParent: true, whosMoving: 'student', visibility: 'live' })
  })
})

describe('photos', () => {
  it('gives an upload link for the own profile, and refuses a key of a different profile and a fifth photo', async () => {
    const me = await own('lister')
    const link = profileUploadUrlResponse.parse((await t.call('lister', 'POST', '/v1/me/profile/upload-urls', { contentType: 'image/webp', size: 1000 })).json())
    expect(link.key).toMatch(new RegExp(`^profiles/${me.id}/[0-9a-f-]{36}\\.webp$`))
    expect((await t.call('newcomer', 'POST', '/v1/me/profile/upload-urls', { contentType: 'image/webp', size: 1000 })).statusCode).toBe(404)
    const parent = await own('parent')
    expect((await edit('lister', { photoKeys: [photoKey(parent.id, 1)] })).statusCode).toBe(400)
    expect((await edit('lister', { photoKeys: [1, 2, 3, 4, 5].map((n) => photoKey(me.id, n)) })).statusCode).toBe(400)
  })

  it('deletes a removed photo in R2 before the row; if R2 fails, nothing changes', async () => {
    const me = await own('lister')
    const keys = [1, 2].map((n) => photoKey(me.id, n))
    expect((await edit('lister', { photoKeys: keys })).statusCode).toBe(200)
    r2Down = true
    expect((await edit('lister', { photoKeys: [keys[0]] })).statusCode).toBe(502)
    expect((await own('lister')).photos.map((p) => p.key)).toEqual(keys)
    r2Down = false
    expect((await edit('lister', { photoKeys: [keys[0]] })).statusCode).toBe(200)
    expect(deleted).toEqual([keys[1]])
    expect((await own('lister')).photos).toEqual([{ key: keys[0], url: `https://photos.example.com/${keys[0]}` }])
  })
})

describe('a card', () => {
  it('shows a live card to others, with no gender, and refuses the own card, a hidden card, a block either way, a draft and a suspended account', async () => {
    const lister = await own('lister')
    const seen = cardResponse.parse((await t.call('seeker', 'GET', `/v1/people/${lister.id}`)).json())
    expect(seen).toMatchObject({ id: lister.id, fullName: 'Shruti Rao', lifestyle: { food: 'veg' } })
    expect(seen).not.toHaveProperty('gender')
    expect((await t.call('lister', 'GET', `/v1/people/${lister.id}`)).statusCode).toBe(404)
    await edit('lister', { hidden: true })
    expect((await t.call('seeker', 'GET', `/v1/people/${lister.id}`)).statusCode).toBe(404)
    await edit('lister', { hidden: false })
    for (const [blocker, blocked] of [[t.ids.lister, t.ids.seeker], [t.ids.seeker, t.ids.lister]] as const) {
      await t.db.insert(blocks).values({ blockerUserId: blocker, blockedUserId: blocked })
      expect((await t.call('seeker', 'GET', `/v1/people/${lister.id}`)).statusCode).toBe(404)
      await t.db.delete(blocks)
    }
    await edit('lister', { areas: [] })
    expect((await t.call('seeker', 'GET', `/v1/people/${lister.id}`)).statusCode).toBe(404)
    await edit('lister', { areas: ['bandra'] })
    await t.db.update(users).set({ status: 'suspended' }).where(eq(users.id, t.ids.lister))
    expect((await t.call('seeker', 'GET', `/v1/people/${lister.id}`)).statusCode).toBe(404)
    await t.db.update(users).set({ status: 'active' }).where(eq(users.id, t.ids.lister))
    expect((await t.call('seeker', 'GET', `/v1/people/${lister.id}`)).statusCode).toBe(200)
    expect((await t.call('seeker', 'GET', '/v1/people/0199e4b0-0000-7000-8000-000000000099')).statusCode).toBe(404)
  })
})

describe('the lister of a listing', () => {
  it('gives the name and the first photo of the profile, and nothing for a card of a son or daughter or no profile', async () => {
    const me = await own('lister')
    await edit('lister', { photoKeys: [photoKey(me.id, 3)] })
    const id = await t.liveListing()
    expect(listingResponse.parse((await t.call('seeker', 'GET', `/v1/listings/${id}`)).json()).lister)
      .toEqual({ name: 'Shruti Rao', photoUrl: `https://photos.example.com/${photoKey(me.id, 3)}` })
    await t.db.update(profiles).set({ managedByParent: true }).where(eq(profiles.userId, t.ids.lister))
    expect(listingResponse.parse((await t.call('seeker', 'GET', `/v1/listings/${id}`)).json()).lister).toBeNull()
    await t.db.delete(profiles).where(eq(profiles.userId, t.ids.lister))
    expect(listingResponse.parse((await t.call('lister', 'GET', `/v1/listings/${id}`)).json()).lister).toBeNull()
  })
})

describe('the deletion of an account', () => {
  it('deletes the photos and the profile', async () => {
    const parent = await own('parent')
    const keys = [1, 2].map((n) => photoKey(parent.id, n))
    expect((await edit('parent', { photoKeys: keys })).statusCode).toBe(200)
    deleted.length = 0
    expect((await t.call('parent', 'DELETE', '/v1/me')).statusCode).toBe(204)
    expect(deleted.sort()).toEqual(keys.sort())
    expect(await t.db.select().from(profiles).where(eq(profiles.userId, t.ids.parent))).toHaveLength(0)
  })
})
