import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { incomingRequestsResponse, meResponse, outgoingRequestsResponse, profileResponse, reportQueueResponse } from '@roomsie/contract'
import { connectionRequests, listings, profiles, reports, users } from '../src/db/schema'
import { testApp, type TestApp } from './app'

type Who = 'lister' | 'seeker' | 'other' | 'moderator'
let t: TestApp<Who>
const cards = {} as Record<'lister' | 'seeker' | 'other', string>
beforeAll(async () => {
  t = await testApp(['lister', 'seeker', 'other', 'moderator'])
  cards.lister = await t.liveCard('lister', 'Neha Iyer')
  cards.seeker = await t.liveCard('seeker', 'Rahul Verma')
  cards.other = await t.liveCard('other', 'Karan Shah')
})
afterAll(() => t.close())
beforeEach(async () => {
  await t.db.delete(reports)
  await t.db.update(profiles).set({ hiddenAt: null })
})

const report = async (who: Who, target: { listingId: string } | { profileId: string }, reason: string, hoursAgo = 0, detail?: string) => {
  const id = uuidv7()
  expect((await t.call(who, 'POST', '/v1/reports', { id, ...target, reason, detail })).statusCode).toBe(204)
  await t.db.update(reports).set({ createdAt: new Date(Date.now() - hoursAgo * 3_600_000) }).where(eq(reports.id, id))
}
const queue = async () => reportQueueResponse.parse((await t.call('moderator', 'GET', '/v1/admin/reports')).json()).items
const review = (kind: 'users' | 'listings', id: string, action: string, who: Who = 'moderator') =>
  t.call(who, 'POST', `/v1/admin/${kind}/${id}/review`, { action })
const cardSeen = async (card: string, who: Who = 'other') => (await t.call(who, 'GET', `/v1/people/${card}`)).statusCode
const statusesOf = async (subjectUserId: string) =>
  (await t.db.select({ status: reports.status }).from(reports).where(eq(reports.subjectUserId, subjectUserId))).map((r) => r.status)

describe('the admin routes', () => {
  it('are for moderators only, and the account reply tells the web who is a moderator', async () => {
    expect(meResponse.parse((await t.call('moderator', 'GET', '/v1/me')).json()).moderator).toBe(true)
    expect(meResponse.parse((await t.call('seeker', 'GET', '/v1/me')).json()).moderator).toBe(false)
    await report('seeker', { profileId: cards.other }, 'fake')
    expect((await t.call('seeker', 'GET', '/v1/admin/reports')).statusCode).toBe(404)
    expect((await review('users', t.ids.other, 'hide', 'seeker')).statusCode).toBe(404)
    expect((await t.call(null, 'GET', '/v1/admin/reports')).statusCode).toBe(401)
    expect(await statusesOf(t.ids.other)).toEqual(['open'])
  })

  it('list one item for each reported person or listing: the safety reports first, then the oldest', async () => {
    const listingId = await t.liveListing()
    await report('seeker', { listingId }, 'broker_or_spam', 3)
    await report('other', { listingId }, 'fake', 1)
    await report('seeker', { profileId: cards.other }, 'other', 2, 'He asked for my number')
    await report('other', { profileId: cards.seeker }, 'harassment', 0.5)
    const items = await queue()
    expect(items.map((i) => (i.kind === 'person' ? i.userId : i.listing.id))).toEqual([t.ids.seeker, listingId, t.ids.other])
    expect(items[0]).toMatchObject({ kind: 'person', hiddenForReview: true, card: { id: cards.seeker, fullName: 'Rahul Verma' }, reports: [{ reason: 'harassment', safety: true }] })
    expect(items[1]).toMatchObject({ kind: 'listing', listing: { id: listingId, hidden: true }, reports: [{ reason: 'broker_or_spam' }, { reason: 'fake' }] })
    expect(items[2]).toMatchObject({ kind: 'person', hiddenForReview: false, reports: [{ reason: 'other', detail: 'He asked for my number' }] })
  })

  it('dismiss closes the reports and brings back the card or the listing', async () => {
    const listingId = await t.liveListing()
    await report('seeker', { listingId }, 'harassment')
    await report('other', { profileId: cards.seeker }, 'under_18')
    expect(await cardSeen(cards.seeker)).toBe(404)
    expect((await review('users', t.ids.seeker, 'dismiss')).statusCode).toBe(204)
    expect((await review('listings', listingId, 'dismiss')).statusCode).toBe(204)
    expect(await cardSeen(cards.seeker)).toBe(200)
    expect((await t.call('other', 'GET', `/v1/listings/${listingId}`)).statusCode).toBe(200)
    expect(await statusesOf(t.ids.seeker)).toEqual(['dismissed'])
    expect(await queue()).toEqual([])
  })

  it('hide closes the reports and hides a card that was visible', async () => {
    await report('seeker', { profileId: cards.other }, 'discriminatory_text')
    expect(await cardSeen(cards.other, 'seeker')).toBe(200)
    expect((await review('users', t.ids.other, 'hide')).statusCode).toBe(204)
    expect(await cardSeen(cards.other, 'seeker')).toBe(404)
    expect(profileResponse.parse((await t.call('other', 'GET', '/v1/me/profile')).json()).hiddenForReview).toBe(true)
    expect(await statusesOf(t.ids.other)).toEqual(['actioned'])
  })

  it('suspend signs the person out, hides the card and the listings, ends the open requests, and closes all the reports', async () => {
    const listingId = await t.liveListing()
    const other = await t.liveListing()
    expect((await t.call('lister', 'POST', '/v1/requests', { toProfileId: cards.seeker, note: 'Hi, I have a room.' })).statusCode).toBe(201)
    expect((await t.call('other', 'POST', '/v1/requests', { toProfileId: cards.lister, note: 'Hi, is the room free?' })).statusCode).toBe(201)
    await report('seeker', { listingId }, 'fake')
    await report('other', { profileId: cards.lister }, 'other', 0, 'Rude')
    expect((await review('listings', listingId, 'suspend')).statusCode).toBe(204)

    expect((await t.call('lister', 'GET', '/v1/me')).statusCode).toBe(401)
    const [user] = await t.db.select({ status: users.status }).from(users).where(eq(users.id, t.ids.lister))
    expect(user!.status).toBe('suspended')
    expect(await cardSeen(cards.lister)).toBe(404)
    for (const id of [listingId, other]) expect((await t.call('seeker', 'GET', `/v1/listings/${id}`)).statusCode).toBe(404)
    expect(incomingRequestsResponse.parse((await t.call('seeker', 'GET', '/v1/requests/incoming')).json()).requests).toEqual([])
    const [request] = await t.db.select({ status: connectionRequests.status }).from(connectionRequests).where(eq(connectionRequests.fromUserId, t.ids.lister))
    expect(request!.status).toBe('withdrawn')
    // The sender of a request to the suspended person sees "not available".
    expect(outgoingRequestsResponse.parse((await t.call('other', 'GET', '/v1/requests/outgoing')).json()).requests)
      .toMatchObject([{ toProfileId: cards.lister, state: 'not_available' }])
    expect(await statusesOf(t.ids.lister)).toEqual(['actioned', 'actioned'])
    expect(await queue()).toEqual([])
    await t.db.update(users).set({ status: 'active', tokensValidAfter: new Date(0) }).where(eq(users.id, t.ids.lister))
    await t.db.update(listings).set({ hiddenAt: null })
  })

  it('a review of an item with no open reports gives 404', async () => {
    expect((await review('users', t.ids.other, 'dismiss')).statusCode).toBe(404)
    expect((await review('listings', '0199e4b0-0000-7000-8000-000000000099', 'hide')).statusCode).toBe(404)
    expect((await review('users', t.ids.other, 'ban')).statusCode).toBe(400)
  })
})
