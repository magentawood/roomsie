import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { adminHomeResponse, adminListingResponse, adminListingsResponse, adminPeopleResponse, adminPersonResponse, listingResponse } from '@roomsie/contract'
import { chatTurns, goals, reports, users } from '../src/db/schema'
import { testApp, type TestApp } from './app'

// The first person owns the listings of the test app, and has no card.
type Who = 'neha' | 'moderator' | 'member' | 'karan' | 'aman'
let t: TestApp<Who>
const cards = {} as Record<'karan' | 'aman', string>
let listingId: string
beforeAll(async () => {
  t = await testApp(['neha', 'moderator', 'member', 'karan', 'aman'])
  cards.karan = await t.liveCard('karan', 'Karan Shah')
  cards.aman = await t.liveCard('aman', 'Aman Gupta')
  listingId = await t.liveListing()
})
afterAll(() => t.close())

const people = async (query = '') => adminPeopleResponse.parse((await t.call('moderator', 'GET', `/v1/admin/people${query}`)).json()).people
const person = async (userId: string) => adminPersonResponse.parse((await t.call('moderator', 'GET', `/v1/admin/people/${userId}`)).json())
const listingsOf = async (query = '') => adminListingsResponse.parse((await t.call('moderator', 'GET', `/v1/admin/listings${query}`)).json()).listings
const act = (kind: 'people' | 'listings', id: string, action: string, who: Who = 'moderator') =>
  t.call(who, 'POST', `/v1/admin/${kind}/${id}/actions`, { action })
const report = async (who: Who, target: { listingId: string } | { profileId: string }, reason: string) => {
  expect((await t.call(who, 'POST', '/v1/reports', { id: uuidv7(), ...target, reason })).statusCode).toBe(204)
}
const statusesOf = async (subjectUserId: string) => (await t.db.select({ status: reports.status }).from(reports).where(eq(reports.subjectUserId, subjectUserId))).map((r) => r.status)

describe('the people of the admin', () => {
  it('finds each account by the name of its card or by its email, and an account with no card', async () => {
    expect((await people('?q=karan')).map((p) => [p.userId, p.name, p.email])).toEqual([[t.ids.karan, 'Karan Shah', 'karan@example.com']])
    expect((await people('?q=neha@')).map((p) => [p.userId, p.name])).toEqual([[t.ids.neha, null]])
    expect((await people()).map((p) => p.userId)).toContain(t.ids.member)
  })

  it('shows the card, the email, the reports and the last activity, and never gender, religion or community', async () => {
    await report('aman', { profileId: cards.karan }, 'fake')
    const [goal] = await t.db.insert(goals).values({ userId: t.ids.karan }).returning()
    const typedAt = new Date(Date.now() + 60_000)
    await t.db.insert(chatTurns).values({ goalId: goal!.id, role: 'user', inputMethod: 'typed', text: 'room in powai', createdAt: typedAt })
    const res = await t.call('moderator', 'GET', `/v1/admin/people/${t.ids.karan}`)
    expect(res.body).not.toMatch(/gender|religion|community/i)
    const karan = adminPersonResponse.parse(res.json())
    expect(karan).toMatchObject({ name: 'Karan Shah', email: 'karan@example.com', openReports: 1, hidden: false, suspended: false, verified: false, card: { id: cards.karan } })
    expect(karan.reports.map((r) => [r.reason, r.status])).toEqual([['fake', 'open']])
    expect(karan.lastActiveAt).toBe(typedAt.toISOString())
    expect((await people('?filter=reported')).map((p) => p.userId)).toEqual([t.ids.karan])
  })

  it('hides and unhides a card, closes its open reports, and logs each action with the moderator', async () => {
    expect((await act('people', t.ids.karan, 'hide')).statusCode).toBe(204)
    expect((await t.call('member', 'GET', `/v1/people/${cards.karan}`)).statusCode).toBe(404)
    expect(await statusesOf(t.ids.karan)).toEqual(['actioned'])
    expect((await people('?filter=hidden')).map((p) => p.userId)).toEqual([t.ids.karan])
    expect((await act('people', t.ids.karan, 'unhide')).statusCode).toBe(204)
    expect((await t.call('member', 'GET', `/v1/people/${cards.karan}`)).statusCode).toBe(200)
    expect((await person(t.ids.karan)).log.map((l) => [l.action, l.by])).toEqual([['unhide', 'moderator@example.com'], ['hide', 'moderator@example.com']])
  })

  it('suspends a person', async () => {
    expect((await act('people', t.ids.aman, 'suspend')).statusCode).toBe(204)
    const [aman] = await t.db.select({ status: users.status }).from(users).where(eq(users.id, t.ids.aman))
    expect(aman!.status).toBe('suspended')
    expect((await people('?filter=suspended')).map((p) => p.userId)).toEqual([t.ids.aman])
  })
})

describe('the listings of the admin', () => {
  it('finds a listing by its area or by the email of its lister', async () => {
    expect((await listingsOf('?q=bandra')).map((l) => l.id)).toEqual([listingId])
    expect((await listingsOf('?q=neha@')).map((l) => [l.id, l.listerEmail])).toEqual([[listingId, 'neha@example.com']])
    expect(await listingsOf('?q=nowhere')).toEqual([])
  })

  it('removes a listing for good: nobody else sees it, and its owner cannot make it live again', async () => {
    await report('member', { listingId }, 'fake')
    expect((await act('listings', listingId, 'remove')).statusCode).toBe(204)
    expect((await t.call('member', 'GET', `/v1/listings/${listingId}`)).statusCode).toBe(404)
    expect(listingResponse.parse((await t.call('neha', 'GET', `/v1/listings/${listingId}`)).json()).removed).toBe(true)
    expect((await t.call('neha', 'POST', `/v1/listings/${listingId}/status`, { status: 'live' })).statusCode).toBe(409)
    const removed = adminListingResponse.parse((await t.call('moderator', 'GET', `/v1/admin/listings/${listingId}`)).json())
    expect(removed).toMatchObject({ removed: true, openReports: 0, listerEmail: 'neha@example.com' })
    expect(removed.log.map((l) => l.action)).toEqual(['remove'])
    expect((await listingsOf('?filter=removed')).map((l) => l.id)).toEqual([listingId])
  })
})

describe('the admin directory', () => {
  it('is not found for a person with no admin role', async () => {
    for (const [method, url] of [['GET', '/v1/admin/people'], ['GET', `/v1/admin/people/${t.ids.karan}`], ['POST', `/v1/admin/people/${t.ids.karan}/actions`],
      ['GET', '/v1/admin/listings'], ['GET', `/v1/admin/listings/${listingId}`], ['POST', `/v1/admin/listings/${listingId}/actions`]] as const) {
      expect((await t.call('member', method, url, method === 'POST' ? { action: 'hide' } : undefined)).statusCode).toBe(404)
    }
  })

  it('gives the card of people and listings on the home', async () => {
    const card = adminHomeResponse.parse((await t.call('moderator', 'GET', '/v1/admin/home')).json()).cards.find((c) => c.subject === 'people_listings')
    expect(card).toEqual({ subject: 'people_listings', people: 2, newToday: 2, liveListings: 0, hidden: 1, suspended: 1 })
  })
})
