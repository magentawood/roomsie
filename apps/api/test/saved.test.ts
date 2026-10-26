import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { listingResponse, meResponse, savedPeopleResponse, savedPlacesResponse } from '@roomsie/contract'
import { createTestDb, type TestDb } from './db'
import { projectId, testTokens } from './tokens'
import { offlineStorage } from '../scripts/openapi'
import { areas, blocks, listings, profiles, saves } from '../src/db/schema'
import { buildServer } from '../src/server'

let testDb: TestDb
let app: ReturnType<typeof buildServer>
let tokens: Record<'lister' | 'seeker', string>
const ids = { lister: '', seeker: '' }

beforeAll(async () => {
  testDb = await createTestDb()
  await testDb.db.insert(areas).values({ slug: 'bandra', name: 'Bandra' })
  const { firebaseKeys, idToken } = await testTokens()
  tokens = { lister: await idToken('uid-lister'), seeker: await idToken('uid-seeker') }
  app = buildServer({ webOrigin: 'http://localhost:3000', db: testDb.db, firebaseProjectId: projectId, firebaseKeys, storage: offlineStorage })
  for (const who of ['lister', 'seeker'] as const) ids[who] = meResponse.parse((await call(who, 'GET', '/v1/me')).json()).id
})
afterAll(async () => {
  await app.close()
  await testDb.drop()
})

const call = (who: 'lister' | 'seeker' | null, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
  app.inject({ method, url, payload, headers: who ? { authorization: `Bearer ${tokens[who]}` } : {} })

async function liveListing() {
  const created = listingResponse.parse((await call('lister', 'POST', '/v1/listings', { kind: 'owner_flat' })).json())
  expect((await call('lister', 'PATCH', `/v1/listings/${created.id}`, { areaSlug: 'bandra', rates: [{ rent: 40000 }] })).statusCode).toBe(200)
  expect((await call('lister', 'POST', `/v1/listings/${created.id}/status`, { status: 'live' })).statusCode).toBe(200)
  return created.id
}
const savedPlaces = async () => savedPlacesResponse.parse((await call('seeker', 'GET', '/v1/saved/places')).json()).places
const savedPeople = async () => savedPeopleResponse.parse((await call('seeker', 'GET', '/v1/saved/people')).json()).people

describe('saved places', () => {
  it('saves a live listing one time, lists it, and unsaves it', async () => {
    const id = await liveListing()
    expect((await call('seeker', 'PUT', `/v1/saved/places/${id}`)).statusCode).toBe(204)
    expect((await call('seeker', 'PUT', `/v1/saved/places/${id}`)).statusCode).toBe(204)
    const places = await savedPlaces()
    expect(places.filter((p) => p.id === id)).toHaveLength(1)
    expect(places[0]).toMatchObject({ id, status: 'live', address: null })

    expect((await call('seeker', 'DELETE', `/v1/saved/places/${id}`)).statusCode).toBe(204)
    expect((await savedPlaces()).some((p) => p.id === id)).toBe(false)
    expect((await call('seeker', 'DELETE', `/v1/saved/places/${id}`)).statusCode).toBe(204)
    expect((await call('seeker', 'DELETE', `/v1/saved/shops/${id}`)).statusCode).toBe(400)
  })

  it('refuses a listing that other users cannot see', async () => {
    const draft = listingResponse.parse((await call('lister', 'POST', '/v1/listings', { kind: 'pg' })).json())
    expect((await call('seeker', 'PUT', `/v1/saved/places/${draft.id}`)).statusCode).toBe(404)
    expect((await call('seeker', 'PUT', '/v1/saved/places/0199e4b0-0000-7000-8000-000000000099')).statusCode).toBe(404)
    expect((await call('seeker', 'PUT', '/v1/saved/places/not-an-id')).statusCode).toBe(400)
    expect((await call(null, 'GET', '/v1/saved/places')).statusCode).toBe(401)
  })

  it('hides a paused, filled or expired listing until it is live again, and the delete of the listing deletes the save', async () => {
    const id = await liveListing()
    await call('seeker', 'PUT', `/v1/saved/places/${id}`)
    const shown = async () => (await savedPlaces()).some((p) => p.id === id)
    for (const status of ['inactive', 'filled'] as const) {
      expect((await call('lister', 'POST', `/v1/listings/${id}/status`, { status })).statusCode).toBe(200)
      expect(await shown()).toBe(false)
      expect((await call('lister', 'POST', `/v1/listings/${id}/status`, { status: 'live' })).statusCode).toBe(200)
      expect(await shown()).toBe(true)
    }
    await testDb.db.update(listings).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(listings.id, id))
    expect(await shown()).toBe(false)
    expect((await call('seeker', 'PUT', `/v1/saved/places/${id}`)).statusCode).toBe(404)

    expect((await call('lister', 'DELETE', `/v1/listings/${id}`)).statusCode).toBe(204)
    expect(await testDb.db.select().from(saves).where(eq(saves.listingId, id))).toHaveLength(0)
  })

  it('lists the newest save first', async () => {
    const [older, newer] = [await liveListing(), await liveListing()]
    await call('seeker', 'PUT', `/v1/saved/places/${older}`)
    await call('seeker', 'PUT', `/v1/saved/places/${newer}`)
    await testDb.db.update(saves).set({ createdAt: new Date(Date.now() - 60_000) }).where(eq(saves.listingId, older))
    const order = (await savedPlaces()).map((p) => p.id).filter((id) => id === older || id === newer)
    expect(order).toEqual([newer, older])
  })
})

describe('saved people', () => {
  const card = async (userId: string, visibility: 'live' | 'hidden' = 'live') =>
    (await testDb.db.insert(profiles).values({ userId, fullName: 'Asha', age: 24, visibility }).returning())[0]!.id

  it('saves a live person one time, lists the person, and unsaves', async () => {
    const asha = await card(ids.lister)
    expect((await call('seeker', 'PUT', `/v1/saved/people/${asha}`)).statusCode).toBe(204)
    expect((await call('seeker', 'PUT', `/v1/saved/people/${asha}`)).statusCode).toBe(204)
    expect(await savedPeople()).toEqual([asha])
    await testDb.db.update(profiles).set({ visibility: 'hidden' }).where(eq(profiles.id, asha))
    expect(await savedPeople()).toEqual([])
    await testDb.db.update(profiles).set({ visibility: 'live' }).where(eq(profiles.id, asha))
    expect(await savedPeople()).toEqual([asha])

    expect((await call('seeker', 'DELETE', `/v1/saved/people/${asha}`)).statusCode).toBe(204)
    expect(await savedPeople()).toEqual([])
    await testDb.db.delete(profiles).where(eq(profiles.id, asha))
  })

  it('refuses the own card, a hidden card, and a person in a block in either direction', async () => {
    const own = await card(ids.seeker)
    expect((await call('seeker', 'PUT', `/v1/saved/people/${own}`)).statusCode).toBe(404)
    await testDb.db.delete(profiles).where(eq(profiles.id, own))

    const hidden = await card(ids.lister, 'hidden')
    expect((await call('seeker', 'PUT', `/v1/saved/people/${hidden}`)).statusCode).toBe(404)

    await testDb.db.update(profiles).set({ visibility: 'live' }).where(eq(profiles.id, hidden))
    expect((await call('seeker', 'PUT', `/v1/saved/people/${hidden}`)).statusCode).toBe(204)
    await testDb.db.insert(blocks).values({ blockerUserId: ids.lister, blockedUserId: ids.seeker })
    expect(await savedPeople()).toEqual([])
    expect((await call('seeker', 'PUT', `/v1/saved/people/${hidden}`)).statusCode).toBe(404)
    await testDb.db.delete(blocks)
    await testDb.db.insert(blocks).values({ blockerUserId: ids.seeker, blockedUserId: ids.lister })
    expect(await savedPeople()).toEqual([])
    await testDb.db.delete(blocks)

    await testDb.db.delete(profiles).where(eq(profiles.id, hidden))
    expect(await testDb.db.select().from(saves).where(eq(saves.profileId, hidden))).toHaveLength(0)
  })
})
