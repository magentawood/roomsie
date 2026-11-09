import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fitResponse, listingResponse, profileResponse, type ProfileEditBody } from '@roomsie/contract'
import { seedCatalogues } from '../src/db/seed-axes'
import { testApp, type TestApp } from './app'

const stated = <V>(value: V) => ({ source: 'stated', value })
const allAnswers = { food: 'veg', smoking: 'non_smoker', tidiness: 'very_tidy', drinks: 'none_at_home' } as const

/** The match box of a detail: the "Best match" rule of PD3a for one card. */
describe('the fit of one card', () => {
  type Who = 'seeker' | 'best' | 'messy' | 'rich' | 'roomie' | 'hindu' | 'lister'
  let t: TestApp<Who>
  const ids = {} as Record<string, string>

  async function person(who: Who, edit: ProfileEditBody) {
    const made = profileResponse.parse((await t.call(who, 'POST', '/v1/me/profile', { fullName: `Card ${who}`, age: 25, gender: 'female' })).json())
    const body = { intent: 'flatmates', whosMoving: 'working', areas: ['bandra'], budgetMin: 15000, budgetMax: 20000, lifestyle: allAnswers, ...edit }
    expect((await t.call(who, 'PATCH', '/v1/me/profile', body)).statusCode).toBe(200)
    ids[who] = made.id
  }

  async function listing(name: string, kind: string, fields: object) {
    const made = listingResponse.parse((await t.call('lister', 'POST', '/v1/listings', { kind })).json())
    expect((await t.call('lister', 'PATCH', `/v1/listings/${made.id}`, { areaSlug: 'bandra', ...fields })).statusCode).toBe(200)
    expect((await t.call('lister', 'POST', `/v1/listings/${made.id}/status`, { status: 'live' })).statusCode).toBe(200)
    ids[name] = made.id
  }

  async function fit(who: Who | null, form: object, kind: 'person' | 'place', name: string) {
    const res = await t.call(who, 'POST', '/v1/results/fit', { form, kind, id: ids[name] })
    expect(res.statusCode).toBe(200)
    return fitResponse.parse(res.json()).bestMatch
  }

  /** Flatmates in Bandra–Santacruz under 20k, with three preferences. */
  const people = {
    intent: stated('flatmates'), areas: stated(['bandra-santacruz']), budget: stated({ min: null, max: 20000 }),
    lifestyle: { smoking: stated('non_smoker'), food: stated('veg'), drinks: stated('none_at_home') },
    mustHaves: { veg_kitchen: stated('prefer'), tidy_flatmates: stated('prefer'), no_alcohol: stated('prefer') },
  }
  /** A PG in Bandra under 20k, with three preferences that a room meets. */
  const pg = {
    intent: stated('pg'), areas: stated(['bandra']), budget: stated({ min: null, max: 20000 }),
    mustHaves: { veg_kitchen: stated('prefer'), non_smokers: stated('prefer'), no_alcohol: stated('prefer') },
  }
  const room = { roomType: 'private', vegOnlyKitchen: true, smokingAllowed: false, alcoholAllowed: false, rates: [{ rent: 19000 }] }

  beforeAll(async () => {
    t = await testApp(['seeker', 'best', 'messy', 'rich', 'roomie', 'hindu', 'lister'])
    await seedCatalogues(t.db)
    await person('seeker', {})
    await person('best', {})
    await person('messy', { lifestyle: { ...allAnswers, tidiness: 'relaxed_about_mess' } })
    await person('rich', { budgetMin: 25000, budgetMax: 30000 })
    await person('roomie', { intent: 'room' })
    await person('hindu', { religion: 'hindu' })
    await listing('room', 'room_in_flat', room)
    await listing('dear', 'room_in_flat', { ...room, rates: [{ rent: 25000 }] })
    await listing('smokers', 'room_in_flat', { ...room, smokingAllowed: true })
  })
  afterAll(() => t.close())

  it('is a best match when the card meets the three preferences, and not when it misses one, fails a filter or seeks something else', async () => {
    expect(await fit('seeker', people, 'person', 'best')).toBe(true)
    expect(await fit('seeker', people, 'person', 'messy')).toBe(false)
    expect(await fit('seeker', people, 'person', 'rich')).toBe(false)
    expect(await fit('seeker', people, 'person', 'roomie')).toBe(false)
    // Two preferences are not enough for the label.
    expect(await fit('seeker', { ...people, mustHaves: { veg_kitchen: stated('prefer'), no_alcohol: stated('prefer') } }, 'person', 'best')).toBe(false)
  })

  it('checks a place of any kind, also one that the place types of the form leave out', async () => {
    expect(await fit('seeker', pg, 'place', 'room')).toBe(true)
    expect(await fit('seeker', pg, 'place', 'dear')).toBe(false)
    expect(await fit('seeker', pg, 'place', 'smokers')).toBe(false)
    expect(await fit(null, pg, 'place', 'room')).toBe(true)
    // A person is not a place.
    expect(await fit('seeker', pg, 'place', 'best')).toBe(false)
  })

  it('leaves out the hidden religion and community filter, so the label tells nothing of them (PD3c)', async () => {
    const onlyOthers = { ...people, religionPreference: stated({ values: ['muslim'], weight: 'dealbreaker' }) }
    expect(await fit('seeker', onlyOthers, 'person', 'hindu')).toBe(true)
  })
})
