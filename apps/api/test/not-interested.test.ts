import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import {
  conversationsResponse, incomingRequestsResponse, notInterestedMessage, outgoingRequest, outgoingRequestsResponse, personResponse,
} from '@roomsie/contract'
import { connectionRequests, notInterested, profiles, reports } from '../src/db/schema'
import { testApp, type TestApp } from './app'

type Who = 'lister' | 'seeker' | 'friend' | 'other'
let t: TestApp<Who>
const cards = {} as Record<'seeker' | 'friend' | 'other', string>
beforeAll(async () => {
  t = await testApp(['lister', 'seeker', 'friend', 'other'])
  cards.seeker = await t.liveCard('seeker', 'Rahul Verma')
  cards.friend = await t.liveCard('friend', 'Divya Sharma')
  cards.other = await t.liveCard('other', 'Karan Shah')
})
afterAll(() => t.close())
beforeEach(async () => {
  await t.db.delete(connectionRequests)
  await t.db.delete(notInterested)
  t.sent.length = 0
})

const pick = (who: Who, target: { profileId: string } | { listingId: string }, id = uuidv7()) => t.call(who, 'POST', '/v1/not-interested', { id, ...target })
const chats = async (who: Who) => conversationsResponse.parse((await t.call(who, 'GET', '/v1/conversations')).json()).conversations
const outgoing = async (who: Who) => outgoingRequestsResponse.parse((await t.call(who, 'GET', '/v1/requests/outgoing')).json()).requests
const incoming = async (who: Who) => incomingRequestsResponse.parse((await t.call(who, 'GET', '/v1/requests/incoming')).json()).requests
const connection = async (who: Who, profileId: string) => personResponse.parse((await t.call(who, 'GET', `/v1/people/${profileId}`)).json()).connection
const sayHi = (who: Who, target: { toProfileId: string } | { listingId: string }) => t.call(who, 'POST', '/v1/requests', { ...target, note: 'Hi, is the room free?' })
/** `from` sends a request, and `to` accepts it. Gives the id of the conversation. */
async function chat(from: Who, to: Who, target: { toProfileId: string } | { listingId: string }) {
  const sent = await sayHi(from, target)
  expect(sent.statusCode).toBe(201)
  const { id } = outgoingRequest.parse(sent.json())
  expect((await t.call(to, 'POST', `/v1/requests/${id}/accept`)).statusCode).toBe(204)
  return id
}

describe('Not interested', () => {
  it('takes the chat out of the Messages of both people, files no report, and stops each new request between them', async () => {
    const id = await chat('seeker', 'friend', { toProfileId: cards.friend })
    await chat('other', 'friend', { toProfileId: cards.friend })
    t.sent.length = 0

    expect((await pick('seeker', { profileId: cards.friend })).statusCode).toBe(204)

    expect(await chats('seeker')).toEqual([])
    expect((await chats('friend')).map((c) => c.other.profileId)).toEqual([cards.other])
    expect(await outgoing('seeker')).toEqual([])
    expect((await t.call('friend', 'GET', `/v1/conversations/${id}/messages`)).statusCode).toBe(404)
    expect((await t.call('friend', 'POST', `/v1/conversations/${id}/messages`, { id: uuidv7(), text: 'Still there?' })).statusCode).toBe(404)
    // The cards stay, with no way to connect.
    expect(await connection('seeker', cards.friend)).toEqual({ state: 'closed' })
    expect(await connection('friend', cards.seeker)).toEqual({ state: 'closed' })
    for (const [who, toProfileId] of [['seeker', cards.friend], ['friend', cards.seeker]] as const) {
      const refused = await sayHi(who, { toProfileId })
      expect(refused.statusCode).toBe(403)
      expect(refused.json()).toEqual({ error: notInterestedMessage })
    }
    // The chat stays in the database for the reports, and no report is filed.
    expect(await t.db.select().from(connectionRequests).where(eq(connectionRequests.id, id))).toMatchObject([{ status: 'accepted' }])
    expect(await t.db.select().from(reports)).toEqual([])
    expect(t.sent).toEqual(expect.arrayContaining([
      { userId: t.ids.seeker, event: 'removed', payload: {} }, { userId: t.ids.friend, event: 'removed', payload: {} },
    ]))
    // A third person is not touched.
    expect(await connection('other', cards.seeker)).toEqual({ state: 'none' })
  })

  it('closes an open request: it leaves the requests of both people', async () => {
    expect((await sayHi('seeker', { toProfileId: cards.friend })).statusCode).toBe(201)

    expect((await pick('friend', { profileId: cards.seeker })).statusCode).toBe(204)

    expect(await incoming('friend')).toEqual([])
    expect(await outgoing('seeker')).toEqual([])
    expect(await t.db.select({ status: connectionRequests.status }).from(connectionRequests)).toEqual([{ status: 'declined' }])
  })

  it('picks a person one time: a retried tap and a second pick add nothing, and the other person can pick too', async () => {
    const id = uuidv7()
    expect((await pick('seeker', { profileId: cards.friend }, id)).statusCode).toBe(204)
    expect((await pick('seeker', { profileId: cards.friend }, id)).statusCode).toBe(204)
    expect((await pick('seeker', { profileId: cards.friend })).statusCode).toBe(204)
    expect((await pick('friend', { profileId: cards.seeker })).statusCode).toBe(204)
    expect(await t.db.select({ userId: notInterested.userId }).from(notInterested)).toEqual(expect.arrayContaining([{ userId: t.ids.seeker }, { userId: t.ids.friend }]))
    expect(await t.db.select().from(notInterested)).toHaveLength(2)
  })

  it('from a listing, needs a chat or a request with its lister, and then stops each request to the lister', async () => {
    const listingId = await t.liveListing()
    expect((await pick('seeker', { listingId })).statusCode).toBe(404)
    await chat('seeker', 'lister', { listingId })

    expect((await pick('seeker', { listingId })).statusCode).toBe(204)

    expect(await chats('seeker')).toEqual([])
    expect(await chats('lister')).toEqual([])
    expect((await sayHi('seeker', { listingId })).statusCode).toBe(403)
    // The listing stays for each person.
    expect((await t.call('seeker', 'GET', `/v1/listings/${listingId}`)).statusCode).toBe(200)
    // An open request to the lister is enough.
    expect((await sayHi('other', { listingId })).statusCode).toBe(201)
    expect((await pick('other', { listingId })).statusCode).toBe(204)
    expect(await outgoing('other')).toEqual([])
  })

  it('takes a card that is not live, and refuses the own card or listing, an unknown card, an id that the client did not make, and a guest', async () => {
    await t.db.update(profiles).set({ visibility: 'draft' }).where(eq(profiles.id, cards.other))
    expect((await pick('seeker', { profileId: cards.other })).statusCode).toBe(204)
    await t.db.update(profiles).set({ visibility: 'live' }).where(eq(profiles.id, cards.other))
    expect((await pick('seeker', { profileId: cards.seeker })).statusCode).toBe(404)
    expect((await pick('lister', { listingId: await t.liveListing() })).statusCode).toBe(404)
    expect((await pick('seeker', { profileId: '0199e4b0-0000-7000-8000-000000000099' })).statusCode).toBe(404)
    expect((await pick('seeker', { profileId: cards.friend }, crypto.randomUUID())).statusCode).toBe(400)
    expect((await t.call(null, 'POST', '/v1/not-interested', { id: uuidv7(), profileId: cards.friend })).statusCode).toBe(401)
    expect(await t.db.select().from(notInterested)).toHaveLength(1)
  })
})
