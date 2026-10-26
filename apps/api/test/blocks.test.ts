import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { incomingRequestsResponse, outgoingRequestsResponse, savedPeopleResponse, savedPlacesResponse } from '@roomsie/contract'
import { blocks, profiles } from '../src/db/schema'
import { testApp, type TestApp } from './app'

type Who = 'lister' | 'seeker' | 'other'
let t: TestApp<Who>
const cards = {} as Record<Who, string>
beforeAll(async () => {
  t = await testApp(['lister', 'seeker', 'other'])
  cards.lister = await t.liveCard('lister', 'Neha Iyer')
  cards.seeker = await t.liveCard('seeker', 'Rahul Verma')
  cards.other = await t.liveCard('other', 'Karan Shah')
})
afterAll(() => t.close())
const block = (who: Who, profileId: string, id = uuidv7()) => t.call(who, 'POST', '/v1/blocks', { id, profileId })
const status = async (who: Who, url: string) => (await t.call(who, 'GET', url)).statusCode

describe('a block', () => {
  it('blocks a person one time: a retried tap and a second block do nothing', async () => {
    const id = uuidv7()
    expect((await block('other', cards.seeker, id)).statusCode).toBe(204)
    expect((await block('other', cards.seeker, id)).statusCode).toBe(204)
    expect((await block('other', cards.seeker)).statusCode).toBe(204)
    expect(await t.db.select().from(blocks).where(eq(blocks.blockerUserId, t.ids.other))).toMatchObject([{ blockedUserId: t.ids.seeker }])
    await t.db.delete(blocks)
  })

  it('hides the two people from each other: the cards, Saved, the listings and the requests', async () => {
    const listingId = await t.liveListing()
    expect((await t.call('seeker', 'PUT', `/v1/saved/people/${cards.lister}`)).statusCode).toBe(204)
    expect((await t.call('seeker', 'PUT', `/v1/saved/places/${listingId}`)).statusCode).toBe(204)
    expect((await t.call('seeker', 'POST', '/v1/requests', { toProfileId: cards.lister, note: 'Hi, is the room free?' })).statusCode).toBe(201)

    expect((await block('lister', cards.seeker)).statusCode).toBe(204)

    expect(await status('seeker', `/v1/people/${cards.lister}`)).toBe(404)
    expect(await status('lister', `/v1/people/${cards.seeker}`)).toBe(404)
    expect(savedPeopleResponse.parse((await t.call('seeker', 'GET', '/v1/saved/people')).json()).people).toEqual([])
    expect(savedPlacesResponse.parse((await t.call('seeker', 'GET', '/v1/saved/places')).json()).places).toEqual([])
    expect(await status('seeker', `/v1/listings/${listingId}`)).toBe(404)
    expect(await status('lister', `/v1/listings/${listingId}`)).toBe(200)
    expect((await t.call('seeker', 'POST', '/v1/requests', { listingId, note: 'Hi' })).statusCode).toBe(404)
    // The open request is declined, so the sender sees "not available", as after a decline.
    expect(outgoingRequestsResponse.parse((await t.call('seeker', 'GET', '/v1/requests/outgoing')).json()).requests)
      .toMatchObject([{ toProfileId: cards.lister, state: 'not_available' }])
    expect(incomingRequestsResponse.parse((await t.call('lister', 'GET', '/v1/requests/incoming')).json()).requests).toEqual([])
    // A third person still sees both.
    expect(await status('other', `/v1/people/${cards.lister}`)).toBe(200)
    expect(await status('other', `/v1/listings/${listingId}`)).toBe(200)
    await t.db.delete(blocks)
  })

  it('takes a card that is not live, and refuses the own card, an unknown card, an id that the client did not make, and a guest', async () => {
    await t.db.update(profiles).set({ visibility: 'draft' }).where(eq(profiles.id, cards.other))
    expect((await block('seeker', cards.other)).statusCode).toBe(204)
    await t.db.update(profiles).set({ visibility: 'live' }).where(eq(profiles.id, cards.other))
    expect((await block('seeker', cards.seeker)).statusCode).toBe(404)
    expect((await block('seeker', '0199e4b0-0000-7000-8000-000000000099')).statusCode).toBe(404)
    expect((await block('seeker', cards.lister, crypto.randomUUID())).statusCode).toBe(400)
    expect((await t.call(null, 'POST', '/v1/blocks', { id: uuidv7(), profileId: cards.lister })).statusCode).toBe(401)
    expect(await t.db.select().from(blocks)).toHaveLength(1)
  })
})
