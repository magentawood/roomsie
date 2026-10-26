import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { listingResponse, myListingsResponse, profileResponse, savedPeopleResponse, savedPlacesResponse } from '@roomsie/contract'
import { profiles, reports } from '../src/db/schema'
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

  it('a second report of the same user files nothing, and so cannot hide the listing with a safety reason', async () => {
    const id = await t.liveListing()
    expect((await report('seeker', id, 'fake')).statusCode).toBe(204)
    expect((await report('seeker', id, 'harassment')).statusCode).toBe(204)
    expect(await seen('other', id)).toBe(200)
    expect(await reportsOf(id)).toMatchObject([{ reason: 'fake' }])
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

describe('person reports', () => {
  let card: string
  let seekerCard: string
  beforeAll(async () => {
    card = await t.liveCard('other', 'Karan Shah')
    seekerCard = await t.liveCard('seeker', 'Rahul Verma')
  })
  beforeEach(async () => {
    await t.db.delete(reports)
    await t.db.update(profiles).set({ hiddenAt: null })
  })
  const reportPerson = (who: Who, reason: string, extra: object = {}) =>
    t.call(who, 'POST', '/v1/reports', { id: uuidv7(), profileId: card, reason, ...extra })
  const cardSeen = async (who: Who) => (await t.call(who, 'GET', `/v1/people/${card}`)).statusCode
  const personReports = () => t.db.select().from(reports).where(eq(reports.profileId, card))

  it('files one report for each user and person, masks the detail, and a retried tap or a second report files nothing', async () => {
    const body = { id: uuidv7(), profileId: card, reason: 'other', detail: 'He asked me to call 98200 12345' }
    expect((await t.call('seeker', 'POST', '/v1/reports', body)).statusCode).toBe(204)
    expect((await t.call('seeker', 'POST', '/v1/reports', body)).statusCode).toBe(204)
    expect((await reportPerson('seeker', 'fake')).statusCode).toBe(204)
    const filed = await personReports()
    expect(filed).toMatchObject([{ reporterUserId: t.ids.seeker, subjectUserId: t.ids.other, listingId: null, reason: 'other', status: 'open' }])
    expect(filed[0]!.detail).not.toContain('98200')
  })

  it('takes a card that is not live, and refuses the own card, an unknown card, two targets and a guest', async () => {
    await t.db.update(profiles).set({ visibility: 'draft' }).where(eq(profiles.id, card))
    expect((await reportPerson('seeker', 'fake')).statusCode).toBe(204)
    await t.db.update(profiles).set({ visibility: 'live' }).where(eq(profiles.id, card))
    expect((await reportPerson('other', 'fake')).statusCode).toBe(404)
    expect((await t.call('seeker', 'POST', '/v1/reports', { id: uuidv7(), profileId: '0199e4b0-0000-7000-8000-000000000099', reason: 'fake' })).statusCode).toBe(404)
    const listingId = await t.liveListing()
    expect((await t.call('seeker', 'POST', '/v1/reports', { id: uuidv7(), profileId: card, listingId, reason: 'fake' })).statusCode).toBe(400)
    expect((await t.call(null, 'POST', '/v1/reports', { id: uuidv7(), profileId: card, reason: 'fake' })).statusCode).toBe(401)
  })

  it('a harassment or under-18 report hides the card at once; the owner sees "hidden for review", and the switch does not bring it back', async () => {
    for (const reason of ['harassment', 'under_18']) {
      await t.db.update(profiles).set({ hiddenAt: null })
      await t.db.delete(reports)
      expect((await t.call('seeker', 'PUT', `/v1/saved/people/${card}`)).statusCode).toBe(204)
      expect((await reportPerson('lister', reason)).statusCode).toBe(204)
      expect(await cardSeen('seeker')).toBe(404)
      expect(savedPeopleResponse.parse((await t.call('seeker', 'GET', '/v1/saved/people')).json()).people).not.toContain(card)
      expect((await t.call('seeker', 'POST', '/v1/requests', { toProfileId: card, note: 'Hi' })).statusCode).toBe(404)
      expect(profileResponse.parse((await t.call('other', 'GET', '/v1/me/profile')).json())).toMatchObject({ hiddenForReview: true })
      expect((await t.call('other', 'PATCH', '/v1/me/profile', { hidden: true })).statusCode).toBe(200)
      expect((await t.call('other', 'PATCH', '/v1/me/profile', { hidden: false })).statusCode).toBe(200)
      expect(await cardSeen('seeker')).toBe(404)
    }
  })

  it('a person whose card reports hid sends no new request until the review', async () => {
    await reportPerson('lister', 'harassment')
    const sent = await t.call('other', 'POST', '/v1/requests', { toProfileId: seekerCard, note: 'Hi' })
    expect(sent.statusCode).toBe(403)
    expect(sent.json()).toEqual({ error: 'Your card is hidden for review.' })
  })

  it('one other report keeps the card up, and reports from two people hide it', async () => {
    expect((await reportPerson('seeker', 'broker_or_spam')).statusCode).toBe(204)
    expect(await cardSeen('lister')).toBe(200)
    expect((await reportPerson('lister', 'fake')).statusCode).toBe(204)
    expect(await cardSeen('seeker')).toBe(404)
  })
})

describe('the settings of PD18', () => {
  it('change the number of reporters and the safety reasons, for listings and for people', async () => {
    const s = await testApp(['lister', 'a', 'b', 'c'], undefined, { REPORT_HIDE_AT_REPORTERS: '3', REPORT_SAFETY_REASONS: 'fake' })
    const id = await s.liveListing()
    const reportListing = (who: 'a' | 'b' | 'c', reason: string) => s.call(who, 'POST', '/v1/reports', { id: uuidv7(), listingId: id, reason })
    const listingSeen = async () => (await s.call('c', 'GET', `/v1/listings/${id}`)).statusCode
    expect((await reportListing('a', 'harassment')).statusCode).toBe(204)
    expect((await reportListing('b', 'broker_or_spam')).statusCode).toBe(204)
    expect(await listingSeen()).toBe(200)
    expect((await reportListing('c', 'broker_or_spam')).statusCode).toBe(204)
    expect(await listingSeen()).toBe(404)
    const card = await s.liveCard('b')
    expect((await s.call('a', 'POST', '/v1/reports', { id: uuidv7(), profileId: card, reason: 'fake' })).statusCode).toBe(204)
    expect((await s.call('c', 'GET', `/v1/people/${card}`)).statusCode).toBe(404)
    await s.close()
  })
})
