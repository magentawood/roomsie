import { describe, expect, it } from 'vitest'
import { addressLine, flatmateLines, moveIn, nearbyLines, pgRateLines, placeLines, ruleLines, termLines, whereLine } from './place-detail'
import { listing } from './test-listing'

describe('the money to move in', () => {
  it('adds the first rent, the deposit and the brokerage, as the designs of the broker flat', () => {
    const broker = listing({ kind: 'broker_flat', rates: [{ sharing: null, rent: 14500, deposit: 14500 }], brokerage: 16000 })
    expect(moveIn(broker)).toEqual({
      lines: [{ label: 'First month’s rent', value: '₹14,500' }, { label: 'Deposit', value: '₹14,500' }, { label: 'Brokerage', value: '₹16,000' }],
      total: '₹45,000',
    })
  })

  it('takes the lowest rent of a PG, with its sharing, and leaves out a deposit that is not set', () => {
    const pg = listing({ kind: 'pg', rates: [{ sharing: 'single', rent: 21000, deposit: 21000 }, { sharing: 'triple', rent: 11500, deposit: null }] })
    expect(moveIn(pg)).toEqual({ lines: [{ label: 'First month’s rent, triple sharing', value: '₹11,500' }], total: '₹11,500' })
  })

  it('has nothing without a rent', () => {
    expect(moveIn(listing({}))).toBeNull()
  })
})

describe('the lines of each part', () => {
  it('gives the rent terms, and leaves out each one that is not set', () => {
    expect(termLines(listing({ electricity: 'included', maintenanceIncluded: true, rentNegotiable: false, minStay: '6_months', availableFrom: '2026-10-25' }))).toEqual([
      { label: 'Electricity', value: 'Included in rent' },
      { label: 'Maintenance', value: 'Included in rent' },
      { label: 'Rent', value: 'Fixed' },
      { label: 'Minimum stay', value: '6 months' },
      { label: 'Available from', value: '25 Oct 26' },
    ])
    expect(termLines(listing({ maintenanceIncluded: false, maintenance: 2500, rentNegotiable: true }))).toEqual([
      { label: 'Maintenance', value: '₹2,500/mo' },
      { label: 'Rent', value: 'Negotiable' },
    ])
    expect(termLines(listing({}))).toEqual([])
  })

  it('gives the place of a room in a flat, with the room and its bathroom', () => {
    const room = listing({ kind: 'room_in_flat', placeType: '2bhk', floor: 10, roomType: 'shared', carpetAreaSqft: 770, bathroom: 'attached', balcony: true, furnishing: 'fully' })
    expect(placeLines(room)).toEqual([
      { label: 'Place type', value: '2 BHK' },
      { label: 'Floor', value: '10' },
      { label: 'The room', value: 'Shared room' },
      { label: 'Carpet area', value: '770 sq ft' },
      { label: 'Bathroom for this room', value: 'Attached bathroom' },
      { label: 'Balcony', value: 'Yes' },
      { label: 'Furnishing', value: 'Fully furnished' },
    ])
    const flat = listing({ kind: 'owner_flat', placeType: '1bhk', floor: 2, furnishing: 'semi', carpetAreaSqft: 450, bathroom: 'attached', balcony: false })
    expect(placeLines(flat).map((l) => l.label)).toEqual(['Place type', 'Floor', 'Furnishing', 'Carpet area', 'Bathroom', 'Balcony'])
    expect(placeLines(listing({ floor: 0 }))).toEqual([{ label: 'Floor', value: 'Ground' }])
    expect(placeLines(listing({ floor: -1, balcony: false }))).toEqual([{ label: 'Floor', value: 'Basement 1' }, { label: 'Balcony', value: 'No' }])
  })

  it('gives the place of a PG, and the rent and deposit of each sharing', () => {
    const pg = listing({ kind: 'pg', bedsFree: '5_plus', bathroom: 'attached', meals: 'veg_included', curfew: 'none',
      rates: [{ sharing: 'single', rent: 21000, deposit: 21000 }, { sharing: 'double', rent: 14500, deposit: null }] })
    expect(placeLines(pg)).toEqual([
      { label: 'Beds free right now', value: '5+' },
      { label: 'Bathroom', value: 'Attached bathroom' },
      { label: 'Meals', value: 'Veg, included' },
      { label: 'Curfew', value: 'No curfew' },
    ])
    expect(pgRateLines(pg)).toEqual([
      { label: 'Single sharing', value: '₹21,000/mo · deposit ₹21,000' },
      { label: 'Double sharing', value: '₹14,500/mo' },
    ])
  })

  it('gives the house rules', () => {
    expect(ruleLines(listing({ vegOnlyKitchen: true, guests: 'welcome', smokingAllowed: false, whoCanMoveIn: 'women', alcoholAllowed: false, whoIsWelcome: ['working_professionals', 'students'] }))).toEqual([
      { label: 'Kitchen', value: 'Veg only' },
      { label: 'Guests', value: 'Guests welcome' },
      { label: 'Smoking', value: 'No smoking' },
      { label: 'Who can move in', value: 'Women' },
      { label: 'Alcohol', value: 'No alcohol at home' },
      { label: 'Who’s welcome', value: 'Working professionals, Students' },
    ])
    expect(ruleLines(listing({ vegOnlyKitchen: false, smokingAllowed: true, alcoholAllowed: true }))).toEqual([
      { label: 'Kitchen', value: 'Veg and non-veg' },
      { label: 'Smoking', value: 'Smoking allowed' },
      { label: 'Alcohol', value: 'Alcohol allowed' },
    ])
  })

  it('gives what is nearby, with the name of the station', () => {
    expect(nearbyLines(listing({ nearestStation: 'Jogeshwari', walkStation: '5_min', walkBus: '10_min', walkMall: 'not_close' }))).toEqual([
      { label: 'Railway or metro station', value: 'Jogeshwari · 5 minute walk' },
      { label: 'Bus stop', value: '10 minute walk' },
      { label: 'Mall', value: 'Not close' },
    ])
    const all = listing({ walkStation: '5_min', walkBus: '5_min', walkMarket: '5_min', walkGym: '5_min', walkMall: '5_min' })
    expect(nearbyLines(all).map((l) => l.label)).toEqual(['Railway or metro station', 'Gym', 'Bus stop', 'Mall', 'Market or groceries'])
  })

  it('gives the people who live there', () => {
    expect(flatmateLines({ name: 'Meera', age: 23, whatTheyDo: 'Software engineer', food: 'non_veg', photoKey: null, photoUrl: null }))
      .toEqual({ name: 'Meera, 23', about: 'Software engineer · Non-veg' })
    expect(flatmateLines({ name: 'Arjun', age: null, whatTheyDo: null, food: null, photoKey: null, photoUrl: null }))
      .toEqual({ name: 'Arjun', about: null })
  })
})

describe('where it is', () => {
  it('gives the building and the area, then the landmark', () => {
    expect(whereLine(listing({ building: 'Orchid Residency', landmark: 'Next to the municipal school' }), 'Andheri–Goregaon'))
      .toBe('Orchid Residency, Andheri–Goregaon • Next to the municipal school')
    expect(whereLine(listing({ building: 'Silver Oak' }), 'Versova, Andheri West')).toBe('Silver Oak, Versova, Andheri West')
    expect(whereLine(listing({}), undefined)).toBeNull()
  })

  it('gives the address, the street and the pincode when the API sends them', () => {
    expect(addressLine(listing({ address: 'Flat 12, B wing', street: 'SV Road', pincode: '400102' }))).toBe('Flat 12, B wing, SV Road, 400102')
    expect(addressLine(listing({ building: 'Orchid Residency' }))).toBeNull()
  })
})
