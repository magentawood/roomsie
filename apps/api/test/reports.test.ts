import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { listingResponse, myListingsResponse, savedPlacesResponse } from '@roomsie/contract'
import { reports } from '../src/db/schema'
import { testApp, type TestApp } from './app'

type Who = 'lister' | 'seeker' | 'other'
let t: TestApp<Who>
beforeAll(async () => { t = await testApp(['lister', 'seeker', 'other']) })
afterAll(() => t.close())
const report = (who: Who, listingId: string, reason: string, extra: object = {}) =>
  t.call(who, 'POST', '/v1/reports', { id: uuidv7(), listingId, reason, ...extra })
const reportsOf = (listingId: string) => t.db.select().from(reports).where(eq(reports.listingId, listingId))
const seen = async (who: Who, id: string) => (await t.call(who, 'GET', `/v1/listings/${id}`)).statusCode

describe('the listing reply', () => {
  it('tells the owner that the listing is theirs', async () => {
    const id = await t.liveListing()
    expect(listingResponse.parse((await t.call('lister', 'GET', `/v1/listings/${id}`)).json())).toMatchObject({ mine: true, hidden: false })
    expect(listingResponse.parse((await t.call('seeker', 'GET', `/v1/listings/${id}`)).json())).toMatchObject({ mine: false, hidden: false })
  })
})

describe('listing reports', () => {
  it('files one report for each user and listing, and a retried tap files no second report', async () => {
    const id = await t.liveListing()
    const body = { id: uuidv7(), listingId: id, reason: 'fake' }
    expect((await t.call('seeker', 'POST', '/v1/reports', body)).statusCode).toBe(204)
    expect((await t.call('seeker', 'POST', '/v1/reports', body)).statusCode).toBe(204)
    expect((await report('seeker', id, 'broker_or_spam')).statusCode).toBe(204)
    expect(await reportsOf(id)).toMatchObject([{ reporterUserId: t.ids.seeker, subjectUserId: t.ids.lister, reason: 'fake', status: 'open' }])
  })

  it('refuses the own listing, a listing that others cannot see, a bad body and a guest', async () => {
    const id = await t.liveListing()
    const draft = listingResponse.parse((await t.call('lister', 'POST', '/v1/listings', { kind: 'pg' })).json())
    expect((await report('lister', id, 'fake')).statusCode).toBe(404)
    expect((await report('seeker', draft.id, 'fake')).statusCode).toBe(404)
    expect((await report('seeker', '0199e4b0-0000-7000-8000-000000000099', 'fake')).statusCode).toBe(404)
    expect((await report('seeker', id, 'rude')).statusCode).toBe(400)
    expect((await report('seeker', id, 'other')).statusCode).toBe(400)
    expect((await report('seeker', id, 'other', { detail: '   ' })).statusCode).toBe(400)
    expect((await t.call('seeker', 'POST', '/v1/reports', { id: crypto.randomUUID(), listingId: id, reason: 'fake' })).statusCode).toBe(400)
    const tenMinutesAgo = (Date.now() - 10 * 60_000).toString(16).padStart(12, '0')
    const oldId = uuidv7().replace(/^(.{8})-(.{4})/, `${tenMinutesAgo.slice(0, 8)}-${tenMinutesAgo.slice(8)}`)
    expect((await t.call('seeker', 'POST', '/v1/reports', { id: oldId, listingId: id, reason: 'fake' })).statusCode).toBe(400)
    expect((await t.call(null, 'POST', '/v1/reports', { id: uuidv7(), listingId: id, reason: 'fake' })).statusCode).toBe(401)
    expect(await reportsOf(id)).toHaveLength(0)
  })

  it('masks a phone number in the detail (PD17)', async () => {
    const id = await t.liveListing()
    expect((await report('seeker', id, 'other', { detail: 'He asked me to call 98200 12345 for a token amount' })).statusCode).toBe(204)
    const [filed] = await reportsOf(id)
    expect(filed!.detail).not.toContain('98200')
  })

  it('a harassment or under-18 report hides the listing from others at once, and the owner still sees it', async () => {
    for (const reason of ['harassment', 'under_18']) {
      const id = await t.liveListing()
      expect((await t.call('other', 'PUT', `/v1/saved/places/${id}`)).statusCode).toBe(204)
      expect((await report('seeker', id, reason)).statusCode).toBe(204)
      expect(await seen('seeker', id)).toBe(404)
      expect(await seen('other', id)).toBe(404)
      expect(savedPlacesResponse.parse((await t.call('other', 'GET', '/v1/saved/places')).json()).places.some((p) => p.id === id)).toBe(false)
      expect((await t.call('other', 'PUT', `/v1/saved/places/${id}`)).statusCode).toBe(404)
      expect(listingResponse.parse((await t.call('lister', 'GET', `/v1/listings/${id}`)).json())).toMatchObject({ mine: true, hidden: true })
      const mine = myListingsResponse.parse((await t.call('lister', 'GET', '/v1/listings/mine')).json()).listings
      expect(mine.find((l) => l.id === id)).toMatchObject({ hidden: true })
    }
  })

  it('one other report keeps the listing up, and reports from two people hide it', async () => {
    const id = await t.liveListing()
    expect((await report('seeker', id, 'broker_or_spam')).statusCode).toBe(204)
    expect(await seen('other', id)).toBe(200)
    expect((await report('other', id, 'fake')).statusCode).toBe(204)
    expect(await seen('seeker', id)).toBe(404)
  })

  it('a change of status by the owner does not bring a hidden listing back', async () => {
    const id = await t.liveListing()
    await report('seeker', id, 'harassment')
    expect((await t.call('lister', 'POST', `/v1/listings/${id}/status`, { status: 'inactive' })).statusCode).toBe(200)
    expect((await t.call('lister', 'POST', `/v1/listings/${id}/status`, { status: 'live' })).statusCode).toBe(200)
    expect(await seen('seeker', id)).toBe(404)
  })

  it('keeps the report for the moderator after the owner deletes the listing', async () => {
    const id = await t.liveListing()
    const body = { id: uuidv7(), listingId: id, reason: 'fake' }
    await t.call('seeker', 'POST', '/v1/reports', body)
    expect((await t.call('lister', 'DELETE', `/v1/listings/${id}`)).statusCode).toBe(204)
    const [kept] = await t.db.select().from(reports).where(eq(reports.id, body.id))
    expect(kept).toMatchObject({ listingId: null, subjectUserId: t.ids.lister, reason: 'fake' })
  })
})
