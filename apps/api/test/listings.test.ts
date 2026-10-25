import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { listingResponse, type ListingResponse } from '@roomsie/contract'
import { createTestDb, type TestDb } from './db'
import { projectId, testTokens } from './tokens'
import { unusedStorage } from '../scripts/openapi'
import { areas, listingFlatmates, listings } from '../src/db/schema'
import { buildServer } from '../src/server'
import type { Storage } from '../src/storage'

let testDb: TestDb
let app: ReturnType<typeof buildServer>
let tokens: Record<string, string>
const deleted: string[] = []
let r2Down = false

const storage: Storage = {
  ...unusedStorage,
  async deleteObjects(keys) {
    if (r2Down) throw new Error('R2 is down')
    deleted.push(...keys)
  },
}

beforeAll(async () => {
  testDb = await createTestDb()
  await testDb.db.insert(areas).values({ slug: 'bandra', name: 'Bandra' })
  const { firebaseKeys, idToken } = await testTokens()
  tokens = { lister: await idToken('uid-lister'), seeker: await idToken('uid-seeker') }
  app = buildServer({ webOrigin: 'http://localhost:3000', db: testDb.db, firebaseProjectId: projectId, firebaseKeys, storage })
})
afterAll(async () => {
  await app.close()
  await testDb.drop()
})
beforeEach(() => {
  deleted.length = 0
  r2Down = false
})

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'
const call = (who: 'lister' | 'seeker', method: Method, url: string, payload?: object) =>
  app.inject({ method, url: `/v1/listings${url}`, payload, headers: { authorization: `Bearer ${tokens[who]}` } })

async function draft(kind: ListingResponse['kind'], edit?: object) {
  const res = await call('lister', 'POST', '', { kind })
  expect(res.statusCode).toBe(201)
  const listing = listingResponse.parse(res.json())
  if (!edit) return listing
  const edited = await call('lister', 'PATCH', `/${listing.id}`, edit)
  expect(edited.statusCode, edited.body).toBe(200)
  return listingResponse.parse(edited.json())
}
const photoKey = (listingId: string, n: number) => `listings/${listingId}/0199e4b0-0000-7000-8000-00000000000${n}.jpg`

describe('a draft', () => {
  it('starts with a kind, and only the lister sees it', async () => {
    const listing = await draft('owner_flat')
    expect(listing).toMatchObject({ kind: 'owner_flat', status: 'draft' })
    expect((await call('seeker', 'GET', `/${listing.id}`)).statusCode).toBe(404)
    expect((await call('lister', 'GET', `/${listing.id}`)).statusCode).toBe(200)
  })

  it('needs sign-in', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/listings', payload: { kind: 'pg' } })
    expect(res.statusCode).toBe(401)
  })

  it('accepts the fields of its kind, and rejects the fields of a different kind', async () => {
    const pg = await draft('pg', { pgName: 'Shivraj PG', sharing: ['double'], meals: 'veg_included', whoCanMoveIn: 'men' })
    expect(pg).toMatchObject({ pgName: 'Shivraj PG', sharing: ['double'], meals: 'veg_included', whoCanMoveIn: 'men' })
    expect((await call('lister', 'PATCH', `/${pg.id}`, { placeType: '2bhk' })).statusCode).toBe(400)
    const room = await draft('room_in_flat')
    expect((await call('lister', 'PATCH', `/${room.id}`, { meals: 'none' })).statusCode).toBe(400)
    expect((await call('lister', 'PATCH', `/${room.id}`, { whoIsWelcome: ['families'] })).statusCode).toBe(400)
  })

  it('rejects an area that does not exist', async () => {
    const listing = await draft('owner_flat')
    expect((await call('lister', 'PATCH', `/${listing.id}`, { areaSlug: 'atlantis' })).statusCode).toBe(400)
  })

  it('replaces the full set of rents and of flatmates', async () => {
    const room = await draft('room_in_flat', {
      rates: [{ rent: 18000, deposit: 36000 }],
      flatmates: [{ name: 'Radhika', age: 24, food: 'veg' }, { name: 'Yash' }],
    })
    expect(room.flatmates.map((f) => f.name)).toEqual(['Radhika', 'Yash'])
    const edited = listingResponse.parse((await call('lister', 'PATCH', `/${room.id}`, { rates: [{ rent: 17000 }], flatmates: [{ name: 'Yash' }] })).json())
    expect(edited.rates).toEqual([{ sharing: null, rent: 17000, deposit: null }])
    expect(edited.flatmates.map((f) => f.name)).toEqual(['Yash'])
  })
})

describe('phone numbers', () => {
  it('never reach the database: each free-text field is masked at save', async () => {
    const pg = await draft('pg', {
      pgName: 'Shivraj PG 98200 12345',
      description: 'Call +91 98200-12345 or wa.me/919820012345. Rent 9000.',
      landmark: 'Near 022 2345 6789',
    })
    expect(pg.pgName).toBe('Shivraj PG ••••')
    expect(pg.description).toBe('Call •••• or ••••. Rent 9000.')
    const [row] = await testDb.db.select().from(listings).where(eq(listings.id, pg.id))
    expect(row).toMatchObject({ pgName: 'Shivraj PG ••••', landmark: 'Near ••••' })

    const room = await draft('room_in_flat', { flatmates: [{ name: 'Yash 9820012345', whatTheyDo: 'Analyst, ping 98200 12345' }] })
    const [mate] = await testDb.db.select().from(listingFlatmates).where(eq(listingFlatmates.listingId, room.id))
    expect(mate).toMatchObject({ name: 'Yash ••••', whatTheyDo: 'Analyst, ping ••••' })
  })
})

describe('going live', () => {
  const live = (id: string) => call('lister', 'POST', `/${id}/status`, { status: 'live' })

  it('lists what is missing', async () => {
    const pg = await draft('pg', { sharing: ['single', 'double'], rates: [{ sharing: 'single', rent: 15000 }] })
    const res = await live(pg.id)
    expect(res.statusCode).toBe(422)
    expect(res.json()).toEqual({ error: 'incomplete', missing: ['areaSlug', 'pgName', 'rates'] })

    const broker = await draft('broker_flat', { areaSlug: 'bandra', rates: [{ rent: 40000 }] })
    expect((await live(broker.id)).json()).toEqual({ error: 'incomplete', missing: ['brokerage'] })

    const room = await draft('room_in_flat', { areaSlug: 'bandra', rates: [{ rent: 18000 }], flatmates: [{ name: 'Radhika' }] })
    expect((await live(room.id)).json()).toEqual({ error: 'incomplete', missing: ['flatmatesConsent'] })
  })

  it('sets an expiry 30 days later, and shows the listing to other users without the address', async () => {
    const flat = await draft('owner_flat', { areaSlug: 'bandra', address: 'Flat 1203, Silver Oak', rates: [{ rent: 52000 }] })
    const res = await live(flat.id)
    expect(res.statusCode).toBe(200)
    const listing = listingResponse.parse(res.json())
    const days = (Date.parse(listing.expiresAt!) - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(29.9)
    expect(days).toBeLessThanOrEqual(30)

    const seenRaw = (await call('seeker', 'GET', `/${flat.id}`)).json()
    expect(seenRaw).not.toHaveProperty('ownerUserId')
    expect(listingResponse.parse(seenRaw)).toMatchObject({ status: 'live', address: null })
    await call('lister', 'PATCH', `/${flat.id}`, { shareAddress: true })
    expect(listingResponse.parse((await call('seeker', 'GET', `/${flat.id}`)).json()).address).toBe('Flat 1203, Silver Oak')
  })

  it('hides an expired listing from other users', async () => {
    const flat = await draft('owner_flat', { areaSlug: 'bandra', rates: [{ rent: 30000 }] })
    await live(flat.id)
    await testDb.db.update(listings).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(listings.id, flat.id))
    expect((await call('seeker', 'GET', `/${flat.id}`)).statusCode).toBe(404)
  })

  it('refuses an edit that leaves a live listing without a rent', async () => {
    const flat = await draft('owner_flat', { areaSlug: 'bandra', rates: [{ rent: 30000 }] })
    await live(flat.id)
    const res = await call('lister', 'PATCH', `/${flat.id}`, { rates: [] })
    expect(res.statusCode).toBe(422)
    expect(listingResponse.parse((await call('lister', 'GET', `/${flat.id}`)).json()).rates).toHaveLength(1)
  })

  it('pauses, fills and goes live again; a draft cannot pause', async () => {
    const flat = await draft('owner_flat', { areaSlug: 'bandra', rates: [{ rent: 30000 }] })
    expect((await call('lister', 'POST', `/${flat.id}/status`, { status: 'inactive' })).statusCode).toBe(409)
    await live(flat.id)
    expect((await call('lister', 'POST', `/${flat.id}/status`, { status: 'inactive' })).json()).toMatchObject({ status: 'inactive' })
    expect((await call('seeker', 'GET', `/${flat.id}`)).statusCode).toBe(404)
    expect((await call('lister', 'POST', `/${flat.id}/status`, { status: 'filled' })).json()).toMatchObject({ status: 'filled' })
    expect((await live(flat.id)).json()).toMatchObject({ status: 'live' })
  })
})

describe('only the lister', () => {
  it('can edit, pause, delete or upload; other users get 404', async () => {
    const flat = await draft('owner_flat', { areaSlug: 'bandra', rates: [{ rent: 30000 }] })
    await call('lister', 'POST', `/${flat.id}/status`, { status: 'live' })
    expect((await call('seeker', 'PATCH', `/${flat.id}`, { description: 'mine now' })).statusCode).toBe(404)
    expect((await call('seeker', 'POST', `/${flat.id}/status`, { status: 'inactive' })).statusCode).toBe(404)
    expect((await call('seeker', 'DELETE', `/${flat.id}`)).statusCode).toBe(404)
    expect((await call('seeker', 'POST', `/${flat.id}/upload-urls`, { contentType: 'image/jpeg', size: 1000 })).statusCode).toBe(404)
    expect((await call('seeker', 'GET', `/${flat.id}`)).statusCode).toBe(200)
  })

  it('sees their own listings in My listings', async () => {
    const flat = await draft('owner_flat')
    const mine = (await call('lister', 'GET', '/mine')).json() as { listings: { id: string }[] }
    expect(mine.listings.map((l) => l.id)).toContain(flat.id)
    const theirs = (await call('seeker', 'GET', '/mine')).json() as { listings: unknown[] }
    expect(theirs.listings).toEqual([])
  })
})

describe('photos', () => {
  it('upload with a signed link that fixes the type and the size', async () => {
    const flat = await draft('owner_flat')
    const res = await call('lister', 'POST', `/${flat.id}/upload-urls`, { contentType: 'image/png', size: 2_000_000 })
    expect(res.statusCode).toBe(200)
    const { key, url, headers } = res.json() as { key: string; url: string; headers: Record<string, string> }
    expect(key).toMatch(new RegExp(`^listings/${flat.id}/[0-9a-f-]{36}\\.png$`))
    const signed = new URL(url)
    expect(signed.pathname.endsWith(key)).toBe(true)
    expect(signed.searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;content-type;host')
    expect(signed.searchParams.get('X-Amz-Expires')).toBe('600')
    expect(headers).toEqual({ 'content-type': 'image/png', 'content-length': '2000000' })
    expect((await call('lister', 'POST', `/${flat.id}/upload-urls`, { contentType: 'image/gif', size: 1000 })).statusCode).toBe(400)
    expect((await call('lister', 'POST', `/${flat.id}/upload-urls`, { contentType: 'image/jpeg', size: 20_000_000 })).statusCode).toBe(400)
  })

  it('accepts only keys of the same listing', async () => {
    const one = await draft('owner_flat')
    const other = await draft('owner_flat')
    expect((await call('lister', 'PATCH', `/${one.id}`, { photoKeys: [photoKey(other.id, 1)] })).statusCode).toBe(400)
    const room = await draft('room_in_flat')
    expect((await call('lister', 'PATCH', `/${room.id}`, { flatmates: [{ name: 'Yash', photoKey: photoKey(other.id, 1) }] })).statusCode).toBe(400)
    const ok = listingResponse.parse((await call('lister', 'PATCH', `/${one.id}`, { photoKeys: [photoKey(one.id, 1)] })).json())
    expect(ok.photos).toEqual([{ key: photoKey(one.id, 1), url: `https://photos.example.com/${photoKey(one.id, 1)}` }])
  })

  it('removed in an edit are deleted in R2 first; if R2 fails, nothing changes', async () => {
    const flat = await draft('owner_flat')
    const keys = [photoKey(flat.id, 1), photoKey(flat.id, 2)]
    await call('lister', 'PATCH', `/${flat.id}`, { photoKeys: keys })
    r2Down = true
    expect((await call('lister', 'PATCH', `/${flat.id}`, { photoKeys: [keys[0]] })).statusCode).toBe(502)
    expect(listingResponse.parse((await call('lister', 'GET', `/${flat.id}`)).json()).photos).toHaveLength(2)
    r2Down = false
    expect((await call('lister', 'PATCH', `/${flat.id}`, { photoKeys: [keys[0]] })).statusCode).toBe(200)
    expect(deleted).toEqual([keys[1]])
  })
})

describe('delete', () => {
  it('deletes the photos and the flatmate photos in R2 first; if R2 fails, the listing stays', async () => {
    const room = await draft('room_in_flat')
    await call('lister', 'PATCH', `/${room.id}`, {
      photoKeys: [photoKey(room.id, 1)],
      flatmates: [{ name: 'Radhika', photoKey: photoKey(room.id, 2) }],
    })
    r2Down = true
    expect((await call('lister', 'DELETE', `/${room.id}`)).statusCode).toBe(502)
    expect((await call('lister', 'GET', `/${room.id}`)).statusCode).toBe(200)
    r2Down = false
    expect((await call('lister', 'DELETE', `/${room.id}`)).statusCode).toBe(204)
    expect(deleted.sort()).toEqual([photoKey(room.id, 1), photoKey(room.id, 2)])
    expect((await call('lister', 'GET', `/${room.id}`)).statusCode).toBe(404)
  })
})
