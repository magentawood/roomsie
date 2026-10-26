import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { listingResponse, meResponse, myListingsResponse, savedPlacesResponse } from '@roomsie/contract'
import { createTestDb, type TestDb } from './db'
import { projectId, testTokens } from './tokens'
import { offlineStorage } from '../scripts/openapi'
import { areas, reports } from '../src/db/schema'
import { buildServer } from '../src/server'

type Who = 'lister' | 'seeker' | 'other'
let testDb: TestDb
let app: ReturnType<typeof buildServer>
let tokens: Record<Who, string>
const ids: Record<Who, string> = { lister: '', seeker: '', other: '' }

beforeAll(async () => {
  testDb = await createTestDb()
  await testDb.db.insert(areas).values({ slug: 'bandra', name: 'Bandra' })
  const { firebaseKeys, idToken } = await testTokens()
  tokens = { lister: await idToken('uid-lister'), seeker: await idToken('uid-seeker'), other: await idToken('uid-other') }
  app = buildServer({ webOrigin: 'http://localhost:3000', db: testDb.db, firebaseProjectId: projectId, firebaseKeys, storage: offlineStorage })
  for (const who of ['lister', 'seeker', 'other'] as const) ids[who] = meResponse.parse((await call(who, 'GET', '/v1/me')).json()).id
})
afterAll(async () => {
  await app.close()
  await testDb.drop()
})

const call = (who: Who | null, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
  app.inject({ method, url, payload, headers: who ? { authorization: `Bearer ${tokens[who]}` } : {} })

async function liveListing() {
  const created = listingResponse.parse((await call('lister', 'POST', '/v1/listings', { kind: 'owner_flat' })).json())
  expect((await call('lister', 'PATCH', `/v1/listings/${created.id}`, { areaSlug: 'bandra', rates: [{ rent: 40000 }] })).statusCode).toBe(200)
  expect((await call('lister', 'POST', `/v1/listings/${created.id}/status`, { status: 'live' })).statusCode).toBe(200)
  return created.id
}
const report = (who: Who, listingId: string, reason: string, extra: object = {}) =>
  call(who, 'POST', '/v1/reports', { id: uuidv7(), listingId, reason, ...extra })
const reportsOf = (listingId: string) => testDb.db.select().from(reports).where(eq(reports.listingId, listingId))
const seen = async (who: Who, id: string) => (await call(who, 'GET', `/v1/listings/${id}`)).statusCode

describe('the listing reply', () => {
  it('tells the owner that the listing is theirs', async () => {
    const id = await liveListing()
    expect(listingResponse.parse((await call('lister', 'GET', `/v1/listings/${id}`)).json())).toMatchObject({ mine: true, hidden: false })
    expect(listingResponse.parse((await call('seeker', 'GET', `/v1/listings/${id}`)).json())).toMatchObject({ mine: false, hidden: false })
  })
})

describe('listing reports', () => {
  it('files one report for each user and listing, and a retried tap files no second report', async () => {
    const id = await liveListing()
    const body = { id: uuidv7(), listingId: id, reason: 'fake' }
    expect((await call('seeker', 'POST', '/v1/reports', body)).statusCode).toBe(204)
    expect((await call('seeker', 'POST', '/v1/reports', body)).statusCode).toBe(204)
    expect((await report('seeker', id, 'broker_or_spam')).statusCode).toBe(204)
    expect(await reportsOf(id)).toMatchObject([{ reporterUserId: ids.seeker, subjectUserId: ids.lister, reason: 'fake', status: 'open' }])
  })

  it('refuses the own listing, a listing that others cannot see, a bad body and a guest', async () => {
    const id = await liveListing()
    const draft = listingResponse.parse((await call('lister', 'POST', '/v1/listings', { kind: 'pg' })).json())
    expect((await report('lister', id, 'fake')).statusCode).toBe(404)
    expect((await report('seeker', draft.id, 'fake')).statusCode).toBe(404)
    expect((await report('seeker', '0199e4b0-0000-7000-8000-000000000099', 'fake')).statusCode).toBe(404)
    expect((await report('seeker', id, 'rude')).statusCode).toBe(400)
    expect((await report('seeker', id, 'other')).statusCode).toBe(400)
    expect((await report('seeker', id, 'other', { detail: '   ' })).statusCode).toBe(400)
    expect((await call('seeker', 'POST', '/v1/reports', { id: crypto.randomUUID(), listingId: id, reason: 'fake' })).statusCode).toBe(400)
    const tenMinutesAgo = (Date.now() - 10 * 60_000).toString(16).padStart(12, '0')
    const oldId = uuidv7().replace(/^(.{8})-(.{4})/, `${tenMinutesAgo.slice(0, 8)}-${tenMinutesAgo.slice(8)}`)
    expect((await call('seeker', 'POST', '/v1/reports', { id: oldId, listingId: id, reason: 'fake' })).statusCode).toBe(400)
    expect((await call(null, 'POST', '/v1/reports', { id: uuidv7(), listingId: id, reason: 'fake' })).statusCode).toBe(401)
    expect(await reportsOf(id)).toHaveLength(0)
  })

  it('masks a phone number in the detail (PD17)', async () => {
    const id = await liveListing()
    expect((await report('seeker', id, 'other', { detail: 'He asked me to call 98200 12345 for a token amount' })).statusCode).toBe(204)
    const [filed] = await reportsOf(id)
    expect(filed!.detail).not.toContain('98200')
  })

  it('a harassment or under-18 report hides the listing from others at once, and the owner still sees it', async () => {
    for (const reason of ['harassment', 'under_18']) {
      const id = await liveListing()
      expect((await call('other', 'PUT', `/v1/saved/places/${id}`)).statusCode).toBe(204)
      expect((await report('seeker', id, reason)).statusCode).toBe(204)
      expect(await seen('seeker', id)).toBe(404)
      expect(await seen('other', id)).toBe(404)
      expect(savedPlacesResponse.parse((await call('other', 'GET', '/v1/saved/places')).json()).places.some((p) => p.id === id)).toBe(false)
      expect((await call('other', 'PUT', `/v1/saved/places/${id}`)).statusCode).toBe(404)
      expect(listingResponse.parse((await call('lister', 'GET', `/v1/listings/${id}`)).json())).toMatchObject({ mine: true, hidden: true })
      const mine = myListingsResponse.parse((await call('lister', 'GET', '/v1/listings/mine')).json()).listings
      expect(mine.find((l) => l.id === id)).toMatchObject({ hidden: true })
    }
  })

  it('one other report keeps the listing up, and reports from two people hide it', async () => {
    const id = await liveListing()
    expect((await report('seeker', id, 'broker_or_spam')).statusCode).toBe(204)
    expect(await seen('other', id)).toBe(200)
    expect((await report('other', id, 'fake')).statusCode).toBe(204)
    expect(await seen('seeker', id)).toBe(404)
  })

  it('a change of status by the owner does not bring a hidden listing back', async () => {
    const id = await liveListing()
    await report('seeker', id, 'harassment')
    expect((await call('lister', 'POST', `/v1/listings/${id}/status`, { status: 'inactive' })).statusCode).toBe(200)
    expect((await call('lister', 'POST', `/v1/listings/${id}/status`, { status: 'live' })).statusCode).toBe(200)
    expect(await seen('seeker', id)).toBe(404)
  })

  it('keeps the report for the moderator after the owner deletes the listing', async () => {
    const id = await liveListing()
    const body = { id: uuidv7(), listingId: id, reason: 'fake' }
    await call('seeker', 'POST', '/v1/reports', body)
    expect((await call('lister', 'DELETE', `/v1/listings/${id}`)).statusCode).toBe(204)
    const [kept] = await testDb.db.select().from(reports).where(eq(reports.id, body.id))
    expect(kept).toMatchObject({ listingId: null, subjectUserId: ids.lister, reason: 'fake' })
  })
})
