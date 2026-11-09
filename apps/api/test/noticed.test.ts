import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { listingResponse, profileResponse, resultsResponse, type MatchResult, type ProfileEditBody } from '@roomsie/contract'
import { seedCatalogues } from '../src/db/seed-axes'
import { testApp, type TestApp } from './app'

const stated = <V>(value: V) => ({ source: 'stated', value })
type Who = 'lister' | 'seeker' | 'asha' | 'ravi' | 'meera' | 'dev'

describe('Roomsie Noticed and several place types', () => {
  let t: TestApp<Who>
  const ids: Record<string, string> = {}

  async function listing(name: string, kind: string, fields: object, areaSlug = 'bandra') {
    const made = listingResponse.parse((await t.call('lister', 'POST', '/v1/listings', { kind })).json())
    expect((await t.call('lister', 'PATCH', `/v1/listings/${made.id}`, { areaSlug, ...fields })).statusCode).toBe(200)
    expect((await t.call('lister', 'POST', `/v1/listings/${made.id}/status`, { status: 'live' })).statusCode).toBe(200)
    ids[name] = made.id
  }
  async function person(who: Who, edit: ProfileEditBody) {
    profileResponse.parse((await t.call(who, 'POST', '/v1/me/profile', { fullName: `Card ${who}`, age: 25, gender: 'female' })).json())
    const body = { intent: 'flatmates', whosMoving: 'working', areas: ['bandra'], budgetMin: 15000, budgetMax: 20000, ...edit }
    expect((await t.call(who, 'PATCH', '/v1/me/profile', body)).statusCode).toBe(200)
  }
  async function search(form: object, page = 1) {
    const res = await t.call('seeker', 'POST', '/v1/results', { form, page })
    expect(res.statusCode).toBe(200)
    return resultsResponse.parse(res.json())
  }
  const names = (results: MatchResult[]) => results.map((r) => Object.keys(ids).find((name) => ids[name] === (r.kind === 'listing' ? r.listing.id : r.card.id)))

  /** Rooms in Bandra under 25k. */
  const rooms = { intent: stated(['room']), areas: stated(['bandra']), budget: stated({ min: null, max: 25000 }) }
  const room = { roomType: 'private', vegOnlyKitchen: false, walkStation: '30_min', rates: [{ rent: 12000 }] }

  beforeAll(async () => {
    t = await testApp(['lister', 'seeker', 'asha', 'ravi', 'meera', 'dev'])
    await seedCatalogues(t.db)
    // Six rooms: one veg kitchen, two near a station, one that did not say its walk.
    await listing('veg', 'room_in_flat', { ...room, vegOnlyKitchen: true, rates: [{ rent: 14000 }] })
    await listing('fiveMin', 'room_in_flat', { ...room, walkStation: '5_min', rates: [{ rent: 16000 }] })
    await listing('tenMin', 'room_in_flat', { ...room, walkStation: '10_min', rates: [{ rent: 18000 }] })
    await listing('noWalk', 'room_in_flat', { ...room, walkStation: null, rates: [{ rent: 20000 }] })
    await listing('far1', 'room_in_flat', { ...room, rates: [{ rent: 22000 }] })
    await listing('far2', 'room_in_flat', room)
    await listing('pg', 'pg', { pgName: 'Shanti PG', sharing: ['double'], walkStation: '30_min', rates: [{ sharing: 'double', rent: 15000 }] })
    // Two 2 BHK flats: one leaves out its maintenance, one has it in the rent.
    await listing('twoBhk', 'owner_flat', { placeType: '2bhk', maintenance: 3000, maintenanceIncluded: false, rates: [{ rent: 40000 }] })
    await listing('twoBhkAll', 'owner_flat', { placeType: '2bhk', maintenanceIncluded: true, rates: [{ rent: 50000 }] })
    await listing('dadar', 'room_in_flat', { ...room, rates: [{ rent: 4500 }] }, 'dadar-west')
    // Flatmates seekers in Bandra: two look for flatmates, one for a room.
    await person('asha', { lifestyle: { food: 'veg' } })
    await person('ravi', { lifestyle: { food: 'non_veg' } })
    await person('meera', { lifestyle: { food: 'non_veg' } })
    await person('dev', { intent: 'room' })
  })
  afterAll(() => t.close())

  it('notes a must-have that few rooms have, the people who could team up, and the rooms near a station, on the first page only', async () => {
    const { total, noticed } = await search(rooms)
    expect(total).toBe(6)
    expect(noticed).toEqual([
      { kind: 'mustHave', key: 'veg_kitchen', count: 1, total: 6 },
      { kind: 'teamUp', count: 3 },
      { kind: 'mustHave', key: 'near_station', count: 2, total: 6 },
    ])
    expect((await search(rooms, 2)).noticed).toEqual([])
  })

  it('notes no must-have that the search already requires', async () => {
    const { noticed } = await search({ ...rooms, mustHaves: { near_station: stated('dealbreaker') } })
    expect(noticed.map((note) => note.kind === 'mustHave' ? note.key : note.kind)).toEqual(['teamUp'])
  })

  it('takes "Near a station" as a must-have: a walk of ten minutes or less, and a room that did not say stays with "Didn\'t say"', async () => {
    const { results } = await search({ ...rooms, mustHaves: { near_station: stated('dealbreaker') } })
    expect(names(results)).toEqual(['tenMin', 'fiveMin', 'noWalk'])
    expect(results.map((r) => r.didntSay)).toEqual([[], [], ['near_station']])
  })

  it('searches each kind of place of the list: rooms and a PG together', async () => {
    const { results, total } = await search({ ...rooms, intent: stated(['room', 'pg']) })
    expect(total).toBe(7)
    expect(names(results)).toContain('pg')
  })

  it('reads a form from before the list, with one place type as a string', async () => {
    expect((await search({ ...rooms, intent: stated('room') })).total).toBe(6)
  })

  it('refuses people to rent with in a list of places', async () => {
    expect((await t.call('seeker', 'POST', '/v1/results', { form: { ...rooms, intent: stated(['room', 'flatmates']) } })).statusCode).toBe(400)
  })

  it('notes the rents of the area, a nearby area, and a 2 BHK split two ways when the budget finds nothing', async () => {
    const { total, noticed } = await search({ ...rooms, budget: stated({ min: null, max: 5000 }) })
    expect(total).toBe(0)
    // The six rooms of Bandra cost 12k to 22k: the middle half is 14k to 20k. A 2 BHK costs 43k (40k and its maintenance) or 50k.
    expect(noticed).toEqual([
      { kind: 'rents', cheapest: 12000, low: 14000, high: 20000 },
      { kind: 'nearbyArea', area: 'dadar-sion' },
      { kind: 'share', each: 21500, maintenanceIncluded: true },
    ])
  })

  it('notes a must-have that few flatmates seekers have, with no notes of places', async () => {
    const { total, noticed } = await search({ ...rooms, intent: stated(['flatmates']) })
    expect(total).toBe(3)
    expect(noticed).toEqual([{ kind: 'mustHave', key: 'veg_kitchen', count: 1, total: 3 }])
  })
})
