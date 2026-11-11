import { describe, expect, it } from 'vitest'
import type { CardResponse } from '@roomsie/contract'
import { flatmateFaces, personFacts, personTags, placeBadge, placeFacts, placeTags, tagLine } from './cards'
import { listing } from './test-listing'

const flatmate = (name: string, photoUrl: string | null = null) => ({ name, age: null, whatTheyDo: null, food: null, photoKey: null, photoUrl })
const lines = (facts: ReturnType<typeof placeFacts>) => facts.map((f) => [f.icon, f.label ?? '', f.value])

describe('the tags line', () => {
  it('shows three values and counts the rest', () => {
    expect(tagLine(['a', null, 'b', 'c', 'd', 'e'])).toEqual({ shown: ['a', 'b', 'c'], more: 2 })
    expect(tagLine(['a'])).toEqual({ shown: ['a'], more: 0 })
    expect(tagLine([null, undefined])).toBeNull()
  })

  it('shows fewer values when three do not fit the card, but always one', () => {
    expect(tagLine(['No smoking', 'Veg kitchen', 'Guests welcome', 'No alcohol', 'Any gender'])).toEqual({ shown: ['No smoking', 'Veg kitchen', 'Guests welcome'], more: 2 })
    expect(tagLine(['Semi furnished', 'Attached bathroom', 'Guests welcome', 'No smoking'])).toEqual({ shown: ['Semi furnished', 'Attached bathroom'], more: 2 })
    expect(tagLine(['A value much longer than the line of a card can hold', 'b'])).toEqual({ shown: ['A value much longer than the line of a card can hold'], more: 1 })
  })

  it('gives the house rules of a room in the order of the designs', () => {
    const room = listing({ kind: 'room_in_flat', smokingAllowed: false, vegOnlyKitchen: true, guests: 'welcome', alcoholAllowed: false, whoCanMoveIn: 'women' })
    expect(placeTags(room)).toEqual({ shown: ['No smoking', 'Veg kitchen', 'Guests welcome'], more: 2 })
  })

  it('puts the furnishing and the bathroom of a flat first', () => {
    expect(placeTags(listing({ kind: 'owner_flat', furnishing: 'semi', bathroom: 'attached', guests: 'day_visits', smokingAllowed: true })))
      .toEqual({ shown: ['Semi furnished', 'Attached bathroom'], more: 2 })
    expect(placeTags(listing({ kind: 'owner_flat', furnishing: 'semi', guests: 'welcome', smokingAllowed: false })))
      .toEqual({ shown: ['Semi furnished', 'Guests welcome', 'No smoking'], more: 0 })
  })

  it('gives the curfew of a PG', () => {
    expect(placeTags(listing({ kind: 'pg', curfew: '10pm' }))).toEqual({ shown: ['Curfew 10 pm'], more: 0 })
    expect(placeTags(listing({ kind: 'pg', curfew: 'none' }))).toEqual({ shown: ['No curfew'], more: 0 })
  })

  it('has no line for a place with no rules', () => {
    expect(placeTags(listing({ kind: 'room_in_flat' }))).toBeNull()
  })
})

describe('the lines of a place card', () => {
  it('gives a private room one person and its date, and drops the person line of a shared room', () => {
    expect(lines(placeFacts(listing({ kind: 'room_in_flat', roomType: 'private', availableFrom: '2026-03-31' }), 'Andheri')))
      .toEqual([['area', '', 'Andheri'], ['people', 'Accommodation:', '1 person'], ['date', 'Available from:', '31 Mar 26']])
    expect(lines(placeFacts(listing({ kind: 'room_in_flat', roomType: 'shared' }), undefined))).toEqual([])
  })

  it('gives the type, the sharing and the meals of a PG', () => {
    const pg = listing({ kind: 'pg', whoCanMoveIn: 'men', whoIsWelcome: ['working_professionals'], sharing: ['single', 'double', 'triple'], meals: 'veg_included' })
    expect(lines(placeFacts(pg, 'Andheri'))).toEqual([
      ['area', '', 'Andheri'], ['type', 'Type:', 'Boys • Working professionals welcome'], ['sharing', 'Sharing:', 'Single, Double, Triple'], ['meals', 'Meals:', 'Veg, included'],
    ])
    expect(lines(placeFacts(listing({ kind: 'pg', whoCanMoveIn: 'any' }), undefined))).toEqual([['type', 'Type:', 'Boys and girls']])
    expect(lines(placeFacts(listing({ kind: 'pg' }), undefined))).toEqual([])
  })

  it('gives a flat the area only, as the designs', () => {
    expect(lines(placeFacts(listing({ kind: 'owner_flat', availableFrom: '2026-03-31', furnishing: 'semi' }), 'Andheri'))).toEqual([['area', '', 'Andheri']])
  })
})

describe('the pill of a place card', () => {
  it('names a verified lister by the kind', () => {
    expect(placeBadge({ kind: 'room_in_flat', verified: true })).toEqual({ label: 'Verified', tone: 'success', verified: true })
    expect(placeBadge({ kind: 'owner_flat', verified: true })).toEqual({ label: 'Owner', tone: 'success', verified: true })
    expect(placeBadge({ kind: 'pg', verified: true })).toEqual({ label: 'Owner', tone: 'success', verified: true })
    expect(placeBadge({ kind: 'broker_flat', verified: true })).toEqual({ label: 'Broker', tone: 'warning', verified: true })
  })

  it('always says Broker, and gives no other pill without a check', () => {
    expect(placeBadge({ kind: 'broker_flat', verified: false })).toEqual({ label: 'Broker', tone: 'warning', verified: false })
    expect(placeBadge({ kind: 'owner_flat', verified: false })).toBeNull()
    expect(placeBadge({ kind: 'room_in_flat', verified: false })).toBeNull()
  })
})

describe('the faces on the photo of a room', () => {
  it('takes three flatmates, those with a photo first', () => {
    const room = listing({ kind: 'room_in_flat', flatmates: [flatmate('Asha'), flatmate('Ben', 'https://p/b.jpg'), flatmate('Chen'), flatmate('Dev', 'https://p/d.jpg')] })
    expect(flatmateFaces(room).map((f) => f.name)).toEqual(['Ben', 'Dev', 'Asha'])
    expect(flatmateFaces(listing({ kind: 'owner_flat' }))).toEqual([])
  })
})

describe('the lines of a person card', () => {
  const card: CardResponse = {
    id: '0199e4b0-0000-7000-8000-000000000001', fullName: 'Divya Trivedi', age: 26, jobRole: 'Business analyst', commuteAddress: null, bio: null,
    managedByParent: false, intent: 'flatmates', whosMoving: 'working', areas: [], budgetMin: null, budgetMax: 25000, moveDate: '2026-03-31', photos: [],
    lifestyle: { smoking: 'non_smoker', guests: 'guests_welcome', sleep: 'night_owl', food: 'veg', pets: 'no_pets' }, mustHaves: {}, verified: true,
  }

  it('gives what they look for, the budget and the date', () => {
    expect(personFacts(card).map((f) => [f.icon, f.label ?? '', f.value])).toEqual([
      ['looking', 'Looking for:', 'Flat with flatmates'], ['budget', '', 'Under ₹25,000'], ['date', 'Available from:', '31 Mar 26'],
    ])
    expect(personFacts({ ...card, intent: 'unclear', budgetMax: null, moveDate: null })).toEqual([])
  })

  it('gives the lifestyle answers as tags', () => {
    expect(personTags(card)).toEqual({ shown: ['Veg', 'Non-smoker', 'Guests welcome'], more: 2 })
    expect(personTags({ ...card, lifestyle: {} })).toBeNull()
  })
})
