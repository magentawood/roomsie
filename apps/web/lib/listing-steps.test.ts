import { describe, expect, it } from 'vitest'
import type { ListingResponse } from '@roomsie/contract'
import { cardActions, listingSteps, listingTitle, missingStep, rentLine, stepBody, stepErrors, stepFields, toEditValues } from './listing-steps'

const listing = (patch: Partial<ListingResponse>): ListingResponse => ({
  id: '0199e4b0-0000-7000-8000-000000000001', kind: 'owner_flat', status: 'draft',
  pgName: null, areaSlug: null, address: null, shareAddress: false, building: null, street: null, landmark: null, pincode: null,
  nearestStation: null, walkStation: null, walkBus: null, walkMarket: null, walkGym: null, walkMall: null,
  placeType: null, furnishing: null, roomType: null, floor: null, carpetAreaSqft: null,
  sharing: [], bedsFree: null, meals: null, curfew: null, bathroom: null, balcony: null, insideItems: [], amenities: [],
  maintenance: null, maintenanceIncluded: null, electricity: null, rentNegotiable: null, brokerage: null, availableFrom: null, minStay: null,
  vegOnlyKitchen: null, smokingAllowed: null, alcoholAllowed: null, guests: null, whoCanMoveIn: null, whoIsWelcome: [],
  flatmatesConsent: false, description: null, photos: [], rates: [], flatmates: [],
  expiresAt: null, createdAt: '2026-10-26T10:00:00.000Z', updatedAt: '2026-10-26T10:00:00.000Z',
  ...patch,
})

describe('the steps of each kind', () => {
  it('gives a room in a flat eight steps, with "Who lives here", and the other kinds seven', () => {
    expect(listingSteps('room_in_flat')).toEqual(['kind', 'where', 'nearby', 'place', 'rent', 'rules', 'people', 'photos'])
    for (const kind of ['owner_flat', 'pg', 'broker_flat'] as const) expect(listingSteps(kind)).not.toContain('people')
    expect(listingSteps('pg')).toHaveLength(7)
    expect(listingSteps(null)).toHaveLength(7)
  })

  it('puts the PG fields on a PG, the flat fields on a flat, and the brokerage on a broker flat', () => {
    expect(stepFields('pg', 'where')).toContain('pgName')
    expect(stepFields('owner_flat', 'where')).not.toContain('pgName')
    expect(stepFields('pg', 'place')).toEqual(expect.arrayContaining(['sharing', 'bedsFree', 'meals', 'curfew']))
    expect(stepFields('pg', 'place')).not.toContain('placeType')
    expect(stepFields('owner_flat', 'place')).toEqual(expect.arrayContaining(['placeType', 'furnishing', 'floor', 'carpetAreaSqft']))
    for (const kind of ['room_in_flat', 'owner_flat', 'broker_flat'] as const) expect(stepFields(kind, 'place')).toContain('roomType')
    expect(stepFields('pg', 'place')).not.toContain('roomType')
    expect(stepFields('broker_flat', 'rent')).toEqual(expect.arrayContaining(['rates', 'brokerage', 'maintenance', 'availableFrom']))
    expect(stepFields('pg', 'rent')).not.toEqual(expect.arrayContaining(['maintenance']))
    expect(stepFields('pg', 'rent')).not.toContain('availableFrom')
  })
})

describe('stepBody', () => {
  it('sends only the fields of the step', () => {
    const body = stepBody('pg', 'where', { pgName: 'Shivraj PG', areaSlug: 'thane', description: 'not on this step', address: null })
    expect(body).toEqual({ pgName: 'Shivraj PG', areaSlug: 'thane', address: null })
  })
})

describe('stepErrors', () => {
  it('finds the values that the API refuses, before the save, with a line for each field', () => {
    expect(stepErrors('room_in_flat', { pincode: '4000' })).toEqual({ pincode: 'A pincode has 6 digits.' })
    expect(stepErrors('room_in_flat', {
      flatmates: [
        { name: 'Radhika', age: 24, whatTheyDo: null, food: null, photoKey: null },
        { name: '', age: 15, whatTheyDo: null, food: null, photoKey: null },
      ],
    })).toEqual({ 'flatmates.1.name': 'Add a name.', 'flatmates.1.age': 'Enter an age from 18 to 99.' })
    expect(stepErrors('owner_flat', { rates: [{ rent: -1, deposit: null }], floor: 300 })).toEqual({
      'rates.0.rent': 'Enter an amount from ₹0 to ₹10 crore.', floor: 'Enter a floor from -3 to 200.',
    })
    expect(stepErrors('pg', { pincode: '400053', rates: [{ sharing: 'double', rent: 9000, deposit: null }] })).toEqual({})
  })
})

describe('toEditValues', () => {
  it('turns photos into keys, drops the photo addresses, and gives a flat rent no sharing type', () => {
    const values = toEditValues(listing({
      photos: [{ key: 'listings/a/b.webp', url: 'https://photos.example.com/listings/a/b.webp' }],
      rates: [{ sharing: null, rent: 52000, deposit: null }],
    }))
    expect(values.photoKeys).toEqual(['listings/a/b.webp'])
    expect(values.rates).toEqual([{ rent: 52000, deposit: null }])
    const room = toEditValues(listing({
      kind: 'room_in_flat',
      flatmates: [{ name: 'Radhika', age: 24, whatTheyDo: null, food: 'veg', photoKey: null, photoUrl: null }],
    }))
    expect(room.flatmates).toEqual([{ name: 'Radhika', age: 24, whatTheyDo: null, food: 'veg', photoKey: null }])
  })

  it('keeps the sharing type of each PG rent', () => {
    const values = toEditValues(listing({ kind: 'pg', rates: [{ sharing: 'double', rent: 9000, deposit: 18000 }] }))
    expect(values.rates).toEqual([{ sharing: 'double', rent: 9000, deposit: 18000 }])
  })
})

describe('after a 422', () => {
  it('links each missing field to its step', () => {
    expect(missingStep).toEqual({ areaSlug: 'where', pgName: 'where', brokerage: 'rent', rates: 'rent', flatmatesConsent: 'people' })
  })
})

describe('My listings', () => {
  it('gives each status its actions', () => {
    expect(cardActions).toEqual({ live: ['edit', 'filled', 'deactivate'], inactive: ['edit', 'live', 'filled'], filled: ['edit', 'live'], draft: ['continue'] })
  })

  it('names each listing and shows its rent', () => {
    expect(listingTitle(listing({ placeType: '2bhk' }))).toBe('2 BHK, full flat')
    expect(listingTitle(listing({ kind: 'room_in_flat', roomType: 'private', placeType: '3bhk' }))).toBe('Private room in 3 BHK')
    expect(listingTitle(listing({ kind: 'pg', pgName: 'Shivraj PG' }))).toBe('Shivraj PG')
    expect(listingTitle(listing({}))).toBe('New listing')
    expect(rentLine(listing({ rates: [{ sharing: null, rent: 52000, deposit: null }] }))).toBe('Rent: ₹52,000/mo')
    expect(rentLine(listing({ kind: 'pg', rates: [{ sharing: 'single', rent: 15000, deposit: null }, { sharing: 'double', rent: 9000, deposit: null }] })))
      .toBe('Rent: ₹9,000–₹15,000/mo')
    expect(rentLine(listing({}))).toBe('Rent: not set yet')
  })
})
