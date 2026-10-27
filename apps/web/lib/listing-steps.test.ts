import { describe, expect, it } from 'vitest'
import { listingTitle } from '@roomsie/contract'
import { listingSteps, rentLine, resumeStep, stepBody, stepErrors, stepFields, toEditValues } from './listing-steps'
import { listing } from './test-listing'

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
    })).toEqual({ 'flatmates.1.name': 'Add a name.', 'flatmates.1.age': 'Enter 18 or more.' })
    expect(stepErrors('owner_flat', { rates: [{ rent: 200_000_000, deposit: null }], floor: 300 })).toEqual({
      'rates.0.rent': 'Enter 10,00,00,000 or less.', floor: 'Enter 200 or less.',
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

describe('My listings', () => {
  it('continues a draft after the last step that has a value', () => {
    expect(resumeStep(listing({}))).toBe(2)
    expect(resumeStep(listing({ areaSlug: 'thane' }))).toBe(3)
    expect(resumeStep(listing({ areaSlug: 'thane', placeType: '2bhk' }))).toBe(5)
    expect(resumeStep(listing({ kind: 'room_in_flat', description: 'Sunny room' }))).toBe(8)
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
