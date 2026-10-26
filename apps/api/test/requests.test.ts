import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { incomingRequestsResponse, outgoingRequest, outgoingRequestsResponse, profileResponse } from '@roomsie/contract'
import { blocks, connectionRequests, listings, profiles, users } from '../src/db/schema'
import { testApp, type TestApp } from './app'

type Who = 'lister' | 'seeker' | 'friend' | 'stranger'
let t: TestApp<Who>
const profileIds: Partial<Record<Who, string>> = {}
const card = { whosMoving: 'working', areas: ['bandra'], budgetMax: 20000 }

beforeAll(async () => {
  t = await testApp(['lister', 'seeker', 'friend', 'stranger'])
  for (const who of ['seeker', 'friend'] as const) {
    const made = profileResponse.parse((await t.call(who, 'POST', '/v1/me/profile', { fullName: who === 'seeker' ? 'Rahul Verma' : 'Divya Sharma', age: 25, gender: 'female' })).json())
    expect((await t.call(who, 'PATCH', '/v1/me/profile', card)).statusCode).toBe(200)
    profileIds[who] = made.id
  }
})
afterAll(() => t.close())

const send = (who: Who, body: object) => t.call(who, 'POST', '/v1/requests', body)
const sayHi = (who: Who, to: Who, note = 'Hi, I saw your card. I work in BKC.') => send(who, { toProfileId: profileIds[to], note })
const outgoing = async (who: Who) => outgoingRequestsResponse.parse((await t.call(who, 'GET', '/v1/requests/outgoing')).json()).requests
const incoming = async (who: Who) => incomingRequestsResponse.parse((await t.call(who, 'GET', '/v1/requests/incoming')).json()).requests

describe('a request to a person', () => {
  it('sends a note to a live card; the recipient sees the sender and the note, and the sender sees it open', async () => {
    const sent = await sayHi('seeker', 'friend', 'Hi! Call me on 98200 12345, I work in BKC.')
    expect(sent.statusCode).toBe(201)
    expect(outgoingRequest.parse(sent.json())).toMatchObject({ toProfileId: profileIds.friend, listingId: null, state: 'open' })
    const [got] = await incoming('friend')
    expect(got).toMatchObject({ from: { profileId: profileIds.seeker, name: 'Rahul Verma' }, listingId: null })
    expect(got!.note).not.toContain('98200')
    expect(await incoming('seeker')).toEqual([])
  })

  it('keeps one open request between two people, in each direction', async () => {
    expect((await sayHi('seeker', 'friend')).statusCode).toBe(409)
    expect((await sayHi('friend', 'seeker')).statusCode).toBe(409)
  })

  it('lets only the recipient answer an open request, one time', async () => {
    const [got] = await incoming('friend')
    expect((await t.call('seeker', 'POST', `/v1/requests/${got!.id}/accept`)).statusCode).toBe(404)
    expect((await t.call('friend', 'POST', `/v1/requests/${got!.id}/accept`)).statusCode).toBe(204)
    expect((await t.call('friend', 'POST', `/v1/requests/${got!.id}/decline`)).statusCode).toBe(404)
    expect((await outgoing('seeker'))[0]).toMatchObject({ state: 'accepted' })
    expect(await incoming('friend')).toEqual([])
    expect((await sayHi('seeker', 'friend')).statusCode).toBe(409)
    await t.db.delete(connectionRequests)
  })

  it('shows a decline as "not available", and the sender can ask again', async () => {
    await sayHi('seeker', 'friend')
    const [got] = await incoming('friend')
    expect((await t.call('friend', 'POST', `/v1/requests/${got!.id}/decline`)).statusCode).toBe(204)
    expect((await outgoing('seeker'))[0]).toMatchObject({ state: 'not_available' })
    expect((await sayHi('seeker', 'friend')).statusCode).toBe(201)
    await t.db.delete(connectionRequests)
  })

  it('expires a request after 14 days: "not available" for the sender, gone for the recipient, and a new request is open', async () => {
    await sayHi('seeker', 'friend')
    await t.db.update(connectionRequests).set({ createdAt: new Date(Date.now() - 15 * 86_400_000) }).where(eq(connectionRequests.fromUserId, t.ids.seeker))
    expect((await outgoing('seeker'))[0]).toMatchObject({ state: 'not_available' })
    expect(await incoming('friend')).toEqual([])
    const [stale] = await t.db.select().from(connectionRequests).where(eq(connectionRequests.fromUserId, t.ids.seeker))
    expect((await t.call('friend', 'POST', `/v1/requests/${stale!.id}/accept`)).statusCode).toBe(404)
    expect((await sayHi('seeker', 'friend')).statusCode).toBe(201)
    await t.db.delete(connectionRequests)
  })

  it('refuses the own card, a hidden card, a suspended account, a block in either direction, an unknown card, and a sender with no profile', async () => {
    expect((await sayHi('seeker', 'seeker')).statusCode).toBe(404)
    await t.db.update(profiles).set({ visibility: 'hidden' }).where(eq(profiles.id, profileIds.friend!))
    expect((await sayHi('seeker', 'friend')).statusCode).toBe(404)
    await t.db.update(profiles).set({ visibility: 'live' }).where(eq(profiles.id, profileIds.friend!))
    await t.db.update(users).set({ status: 'suspended' }).where(eq(users.id, t.ids.friend))
    expect((await sayHi('seeker', 'friend')).statusCode).toBe(404)
    await t.db.update(users).set({ status: 'active' }).where(eq(users.id, t.ids.friend))
    for (const [blocker, blocked] of [[t.ids.friend, t.ids.seeker], [t.ids.seeker, t.ids.friend]] as const) {
      await t.db.insert(blocks).values({ blockerUserId: blocker, blockedUserId: blocked })
      expect((await sayHi('seeker', 'friend')).statusCode).toBe(404)
      await t.db.delete(blocks)
    }
    expect((await send('seeker', { toProfileId: '0199e4b0-0000-7000-8000-000000000099', note: 'Hi' })).statusCode).toBe(404)
    expect((await sayHi('stranger', 'friend')).statusCode).toBe(409)
  })

  it('lets a sender with a draft card ask', async () => {
    await t.db.update(profiles).set({ visibility: 'draft' }).where(eq(profiles.id, profileIds.seeker!))
    expect((await sayHi('seeker', 'friend')).statusCode).toBe(201)
    await t.db.update(profiles).set({ visibility: 'live' }).where(eq(profiles.id, profileIds.seeker!))
    await t.db.delete(connectionRequests)
  })

  it('checks the note and the target', async () => {
    expect((await send('seeker', { toProfileId: profileIds.friend, note: '   ' })).statusCode).toBe(400)
    expect((await send('seeker', { toProfileId: profileIds.friend, note: 'x'.repeat(301) })).statusCode).toBe(400)
    expect((await send('seeker', { note: 'Hi' })).statusCode).toBe(400)
    expect((await send('seeker', { toProfileId: profileIds.friend, listingId: profileIds.friend, note: 'Hi' })).statusCode).toBe(400)
    expect((await t.call(null, 'POST', '/v1/requests', { toProfileId: profileIds.friend, note: 'Hi' })).statusCode).toBe(401)
  })
})

describe('a request to a lister', () => {
  it('goes through a live listing to its owner, who needs no profile', async () => {
    const id = await t.liveListing()
    const sent = await send('seeker', { listingId: id, note: 'Is the room free from 1 Dec?' })
    expect(sent.statusCode).toBe(201)
    expect(outgoingRequest.parse(sent.json())).toMatchObject({ toProfileId: null, listingId: id, state: 'open' })
    expect((await incoming('lister'))[0]).toMatchObject({ listingId: id, from: { name: 'Rahul Verma' } })
    expect((await send('seeker', { listingId: id, note: 'Again?' })).statusCode).toBe(409)
    await t.db.delete(connectionRequests)
  })

  it('counts a card and a listing of the same person as one pair', async () => {
    const id = await t.liveListing()
    await t.db.update(listings).set({ ownerUserId: t.ids.friend }).where(eq(listings.id, id))
    expect((await sayHi('seeker', 'friend')).statusCode).toBe(201)
    expect((await send('seeker', { listingId: id, note: 'Hi' })).statusCode).toBe(409)
    await t.db.delete(connectionRequests)
  })

  it('refuses a listing that is not live, the own listing, a suspended owner, and a block in either direction', async () => {
    const id = await t.liveListing()
    const sayHiTo = () => send('seeker', { listingId: id, note: 'Hi' })
    await t.db.update(listings).set({ status: 'inactive' }).where(eq(listings.id, id))
    expect((await sayHiTo()).statusCode).toBe(404)
    await t.db.update(listings).set({ status: 'live', ownerUserId: t.ids.seeker }).where(eq(listings.id, id))
    expect((await sayHiTo()).statusCode).toBe(404)
    await t.db.update(listings).set({ ownerUserId: t.ids.lister }).where(eq(listings.id, id))
    await t.db.update(users).set({ status: 'suspended' }).where(eq(users.id, t.ids.lister))
    expect((await sayHiTo()).statusCode).toBe(404)
    await t.db.update(users).set({ status: 'active' }).where(eq(users.id, t.ids.lister))
    for (const [blocker, blocked] of [[t.ids.lister, t.ids.seeker], [t.ids.seeker, t.ids.lister]] as const) {
      await t.db.insert(blocks).values({ blockerUserId: blocker, blockedUserId: blocked })
      expect((await sayHiTo()).statusCode).toBe(404)
      await t.db.delete(blocks)
    }
  })
})

describe('the daily limit', () => {
  it('lets a sender start 10 requests in a day of India time, and refuses the eleventh', async () => {
    // India is 5 h 30 min ahead of UTC, with no summer time.
    const indiaOffset = 5.5 * 3_600_000
    const lastMinuteOfYesterday = new Date(Math.floor((Date.now() + indiaOffset) / 86_400_000) * 86_400_000 - indiaOffset - 60_000)
    const today = new Date()
    const row = (createdAt: Date) => ({
      fromUserId: t.ids.seeker, fromProfileId: profileIds.seeker!, toUserId: t.ids.friend, toProfileId: profileIds.friend!,
      note: 'Hi', status: 'declined' as const, createdAt,
    })
    await t.db.insert(connectionRequests).values([row(lastMinuteOfYesterday), ...Array.from({ length: 9 }, () => row(today))])
    expect((await sayHi('seeker', 'friend')).statusCode).toBe(201)
    const id = await t.liveListing()
    const eleventh = await send('seeker', { listingId: id, note: 'Hi' })
    expect(eleventh.statusCode).toBe(429)
    expect(eleventh.json()).toEqual({ error: 'You can send 10 new requests a day. Try again tomorrow.' })
  })
})
