import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { listingResponse, savedPeopleResponse, savedPlacesResponse } from '@roomsie/contract'
import { blocks, listings, profiles, saves } from '../src/db/schema'
import { testApp, type TestApp } from './app'

let t: TestApp<'lister' | 'seeker'>
beforeAll(async () => { t = await testApp(['lister', 'seeker']) })
afterAll(() => t.close())
const savedPlaces = async () => savedPlacesResponse.parse((await t.call('seeker', 'GET', '/v1/saved/places')).json()).places
const savedPeople = async () => savedPeopleResponse.parse((await t.call('seeker', 'GET', '/v1/saved/people')).json()).people

describe('saved places', () => {
  it('saves a live listing one time, lists it, and unsaves it', async () => {
    const id = await t.liveListing()
    expect((await t.call('seeker', 'PUT', `/v1/saved/places/${id}`)).statusCode).toBe(204)
    expect((await t.call('seeker', 'PUT', `/v1/saved/places/${id}`)).statusCode).toBe(204)
    const places = await savedPlaces()
    expect(places.filter((p) => p.id === id)).toHaveLength(1)
    expect(places[0]).toMatchObject({ id, status: 'live', address: null })

    expect((await t.call('seeker', 'DELETE', `/v1/saved/places/${id}`)).statusCode).toBe(204)
    expect((await savedPlaces()).some((p) => p.id === id)).toBe(false)
    expect((await t.call('seeker', 'DELETE', `/v1/saved/places/${id}`)).statusCode).toBe(204)
    expect((await t.call('seeker', 'DELETE', `/v1/saved/shops/${id}`)).statusCode).toBe(400)
  })

  it('refuses a listing that other users cannot see', async () => {
    const draft = listingResponse.parse((await t.call('lister', 'POST', '/v1/listings', { kind: 'pg' })).json())
    expect((await t.call('seeker', 'PUT', `/v1/saved/places/${draft.id}`)).statusCode).toBe(404)
    expect((await t.call('seeker', 'PUT', '/v1/saved/places/0199e4b0-0000-7000-8000-000000000099')).statusCode).toBe(404)
    expect((await t.call('seeker', 'PUT', '/v1/saved/places/not-an-id')).statusCode).toBe(400)
    expect((await t.call(null, 'GET', '/v1/saved/places')).statusCode).toBe(401)
  })

  it('hides a paused, filled or expired listing until it is live again, and the delete of the listing deletes the save', async () => {
    const id = await t.liveListing()
    await t.call('seeker', 'PUT', `/v1/saved/places/${id}`)
    const shown = async () => (await savedPlaces()).some((p) => p.id === id)
    for (const status of ['inactive', 'filled'] as const) {
      expect((await t.call('lister', 'POST', `/v1/listings/${id}/status`, { status })).statusCode).toBe(200)
      expect(await shown()).toBe(false)
      expect((await t.call('lister', 'POST', `/v1/listings/${id}/status`, { status: 'live' })).statusCode).toBe(200)
      expect(await shown()).toBe(true)
    }
    await t.db.update(listings).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(listings.id, id))
    expect(await shown()).toBe(false)
    expect((await t.call('seeker', 'PUT', `/v1/saved/places/${id}`)).statusCode).toBe(404)

    expect((await t.call('lister', 'DELETE', `/v1/listings/${id}`)).statusCode).toBe(204)
    expect(await t.db.select().from(saves).where(eq(saves.listingId, id))).toHaveLength(0)
  })

  it('lists the newest save first', async () => {
    const [older, newer] = [await t.liveListing(), await t.liveListing()]
    await t.call('seeker', 'PUT', `/v1/saved/places/${older}`)
    await t.call('seeker', 'PUT', `/v1/saved/places/${newer}`)
    await t.db.update(saves).set({ createdAt: new Date(Date.now() - 60_000) }).where(eq(saves.listingId, older))
    const order = (await savedPlaces()).map((p) => p.id).filter((id) => id === older || id === newer)
    expect(order).toEqual([newer, older])
  })
})

describe('saved people', () => {
  const card = async (userId: string, visibility: 'live' | 'hidden' = 'live') =>
    (await t.db.insert(profiles).values({ userId, fullName: 'Asha', age: 24, visibility }).returning())[0]!.id

  it('saves a live person one time, lists the person, and unsaves', async () => {
    const asha = await card(t.ids.lister)
    expect((await t.call('seeker', 'PUT', `/v1/saved/people/${asha}`)).statusCode).toBe(204)
    expect((await t.call('seeker', 'PUT', `/v1/saved/people/${asha}`)).statusCode).toBe(204)
    expect(await savedPeople()).toEqual([asha])
    await t.db.update(profiles).set({ visibility: 'hidden' }).where(eq(profiles.id, asha))
    expect(await savedPeople()).toEqual([])
    await t.db.update(profiles).set({ visibility: 'live' }).where(eq(profiles.id, asha))
    expect(await savedPeople()).toEqual([asha])

    expect((await t.call('seeker', 'DELETE', `/v1/saved/people/${asha}`)).statusCode).toBe(204)
    expect(await savedPeople()).toEqual([])
    await t.db.delete(profiles).where(eq(profiles.id, asha))
  })

  it('refuses the own card, a hidden card, and a person in a block in either direction', async () => {
    const own = await card(t.ids.seeker)
    expect((await t.call('seeker', 'PUT', `/v1/saved/people/${own}`)).statusCode).toBe(404)
    await t.db.delete(profiles).where(eq(profiles.id, own))

    const hidden = await card(t.ids.lister, 'hidden')
    expect((await t.call('seeker', 'PUT', `/v1/saved/people/${hidden}`)).statusCode).toBe(404)

    await t.db.update(profiles).set({ visibility: 'live' }).where(eq(profiles.id, hidden))
    expect((await t.call('seeker', 'PUT', `/v1/saved/people/${hidden}`)).statusCode).toBe(204)
    await t.db.insert(blocks).values({ blockerUserId: t.ids.lister, blockedUserId: t.ids.seeker })
    expect(await savedPeople()).toEqual([])
    expect((await t.call('seeker', 'PUT', `/v1/saved/people/${hidden}`)).statusCode).toBe(404)
    await t.db.delete(blocks)
    await t.db.insert(blocks).values({ blockerUserId: t.ids.seeker, blockedUserId: t.ids.lister })
    expect(await savedPeople()).toEqual([])
    await t.db.delete(blocks)

    await t.db.delete(profiles).where(eq(profiles.id, hidden))
    expect(await t.db.select().from(saves).where(eq(saves.profileId, hidden))).toHaveLength(0)
  })
})
