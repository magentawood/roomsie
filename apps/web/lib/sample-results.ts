import { formA, type CardResponse, type FormA, type ListingResponse, type MatchResult } from '@roomsie/contract'
import type { Found } from './results'
// Borrowed from the tests: a sample place needs each field of a listing.
import { listing as emptyListing, testId as id } from './test-listing'

/** The data of `/chat?preview=results` and `?preview=empty`, for a check of the designs. */
export const previews = ['results', 'empty'] as const
export type Preview = (typeof previews)[number]

/** Three stated preferences, so a full match gets the "Best match" label (PD3a). */
export const sampleForm: FormA = formA.parse({
  intent: { source: 'stated', value: 'room' },
  areas: { source: 'stated', value: ['powai-vikhroli'] },
  budget: { source: 'stated', value: { min: null, max: 25000 } },
  mustHaves: {
    veg_kitchen: { source: 'stated', value: 'dealbreaker' }, non_smokers: { source: 'stated', value: 'dealbreaker' },
    no_alcohol: { source: 'stated', value: 'prefer' },
  },
})

const live = { status: 'live', areaSlug: 'powai-vikhroli', availableFrom: '2026-11-15', verified: true } as const

const place = (n: number, patch: Partial<ListingResponse>): ListingResponse => emptyListing({ id: id(n), ...live, ...patch })
const flatmate = (name: string) => ({ name, age: null, whatTheyDo: null, food: null, photoKey: null, photoUrl: null })

const person = (n: number, patch: Partial<CardResponse>): CardResponse => ({
  id: id(n), fullName: 'Divya Trivedi', age: 26, jobRole: 'Business analyst', commuteAddress: null,
  bio: 'Sunday plans? Long breakfast, then cricket. I’m all up for long drives and sleepy weekends.',
  managedByParent: false, intent: 'room', whosMoving: 'working', areas: ['powai-vikhroli'], budgetMin: null, budgetMax: 25000,
  moveDate: '2026-11-15', photos: [], lifestyle: { food: 'veg', smoking: 'non_smoker', guests: 'guests_welcome', sleep: 'night_owl' },
  mustHaves: {}, verified: true, ...patch,
})

type Labels = Partial<Pick<MatchResult, 'bestMatch' | 'didntSay'>>
const placeMatch = (listing: ListingResponse, labels: Labels = {}): MatchResult => ({ kind: 'listing', listing, bestMatch: false, didntSay: [], ...labels })
const personMatch = (card: CardResponse, labels: Labels = {}): MatchResult => ({ kind: 'person', card, bestMatch: false, didntSay: [], ...labels })

/** The mix of kinds is on purpose, to show each card. A real "room" search gives rooms only (PD3a). */
const sampleMatches: Found = {
  total: 8,
  results: [
    placeMatch(place(1, { kind: 'room_in_flat', placeType: '3bhk', roomType: 'private', rates: [{ sharing: null, rent: 18000, deposit: 36000 }], vegOnlyKitchen: true, smokingAllowed: false, alcoholAllowed: false, guests: 'welcome', flatmates: [flatmate('Sienna'), flatmate('Pippa')] }), { bestMatch: true }),
    personMatch(person(2, { lifestyle: { food: 'veg', smoking: 'non_smoker', drinks: 'none_at_home', guests: 'guests_welcome', sleep: 'night_owl' } }), { bestMatch: true }),
    placeMatch(place(3, { kind: 'owner_flat', placeType: '1bhk', furnishing: 'semi', bathroom: 'attached', rates: [{ sharing: null, rent: 24000, deposit: 72000 }], vegOnlyKitchen: true, smokingAllowed: false })),
    placeMatch(place(4, { kind: 'pg', pgName: 'Shanti Ladies PG', whoCanMoveIn: 'women', whoIsWelcome: ['working_professionals'], sharing: ['single', 'double'], meals: 'veg_included', curfew: '10pm', rates: [{ sharing: 'single', rent: 16000, deposit: 16000 }, { sharing: 'double', rent: 11000, deposit: 11000 }], vegOnlyKitchen: true, smokingAllowed: false })),
    placeMatch(place(5, { kind: 'broker_flat', placeType: '2bhk', furnishing: 'fully', brokerage: 25000, rates: [{ sharing: null, rent: 23000, deposit: 69000 }], vegOnlyKitchen: true, smokingAllowed: false, verified: false })),
    personMatch(person(6, { fullName: 'Aarav Mehta', age: 19, jobRole: null, whosMoving: 'student', managedByParent: true, verified: false, bio: null })),
    personMatch(person(7, { fullName: 'Sneha Kulkarni', age: 24, jobRole: 'UX designer', lifestyle: { food: 'veg', guests: 'weekends_only' } }), { didntSay: ['non_smokers'] }),
    placeMatch(place(8, { kind: 'room_in_flat', placeType: '2bhk', roomType: 'shared', rates: [{ sharing: null, rent: 12000, deposit: 24000 }], smokingAllowed: false }), { didntSay: ['veg_kitchen'] }),
  ],
  suggested: [],
  noticed: [
    { kind: 'mustHave', key: 'veg_kitchen', count: 6, total: 24 }, { kind: 'teamUp', count: 15 }, { kind: 'mustHave', key: 'near_station', count: 12, total: 24 },
  ],
}

/** No match in the budget: the suggested posts are the next band and a neighbouring area group (PD6c). */
const sampleEmpty: Found = {
  total: 0,
  results: [],
  suggested: [
    placeMatch(place(9, { kind: 'room_in_flat', placeType: '2bhk', roomType: 'private', rates: [{ sharing: null, rent: 28000, deposit: 56000 }] })),
    placeMatch(place(10, { kind: 'room_in_flat', placeType: '3bhk', roomType: 'shared', areaSlug: 'andheri-goregaon', rates: [{ sharing: null, rent: 14000, deposit: 28000 }] })),
  ],
  noticed: [
    { kind: 'rents', cheapest: 10000, low: 12500, high: 18000 }, { kind: 'nearbyArea', area: 'andheri-goregaon' }, { kind: 'share', each: 35500, maintenanceIncluded: true },
  ],
}

export const samples: Record<Preview, Found> = { results: sampleMatches, empty: sampleEmpty }
