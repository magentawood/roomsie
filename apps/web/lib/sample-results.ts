import { formA, type CardResponse, type FormA, type ListingResponse, type MatchResult } from '@roomsie/contract'
import type { ResultsPage } from './results'
import { listing as emptyListing } from './test-listing'

/**
 * The data of `/chat?preview=results` and `?preview=empty` (T-15). The assistant (T-12) does not fill Form A yet,
 * and the match query (T-14) does not exist, so the panel shows these. TODO(T-14): remove the preview with this file.
 */
export const sampleForm: FormA = formA.parse({
  intent: { source: 'stated', value: 'room' },
  areas: { source: 'stated', value: ['powai-vikhroli'] },
  budget: { source: 'stated', value: { min: null, max: 25000 } },
  mustHaves: { veg_kitchen: { source: 'stated', value: 'dealbreaker' }, non_smokers: { source: 'stated', value: 'dealbreaker' } },
})

const id = (n: number) => `0199e4b0-0000-7000-8000-${String(n).padStart(12, '0')}`
const live = { status: 'live', areaSlug: 'powai-vikhroli', availableFrom: '2026-11-15', verified: true } as const

const place = (n: number, patch: Partial<ListingResponse>): ListingResponse => emptyListing({ id: id(n), ...live, ...patch })

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

/** The five card kinds of the Product file, in the Best Matches order of PD3a: the "Didn't say" cards last. */
export const sampleMatches: ResultsPage = {
  results: [
    placeMatch(place(1, { kind: 'room_in_flat', placeType: '3bhk', roomType: 'private', rates: [{ sharing: null, rent: 18000, deposit: 36000 }], vegOnlyKitchen: true, smokingAllowed: false }), { bestMatch: true }),
    personMatch(person(2, {}), { bestMatch: true }),
    placeMatch(place(3, { kind: 'owner_flat', placeType: '1bhk', furnishing: 'semi', rates: [{ sharing: null, rent: 24000, deposit: 72000 }], vegOnlyKitchen: true, smokingAllowed: false })),
    placeMatch(place(4, { kind: 'pg', pgName: 'Shanti Ladies PG', rates: [{ sharing: 'single', rent: 16000, deposit: 16000 }, { sharing: 'double', rent: 11000, deposit: 11000 }], vegOnlyKitchen: true, smokingAllowed: false })),
    placeMatch(place(5, { kind: 'broker_flat', placeType: '2bhk', furnishing: 'fully', brokerage: 25000, rates: [{ sharing: null, rent: 23000, deposit: 69000 }], vegOnlyKitchen: true, smokingAllowed: false, verified: false })),
    personMatch(person(6, { fullName: 'Aarav Mehta', age: 19, jobRole: null, whosMoving: 'student', managedByParent: true, verified: false, bio: null })),
    personMatch(person(7, { fullName: 'Sneha Kulkarni', age: 24, jobRole: 'UX designer', lifestyle: { food: 'veg', guests: 'weekends_only' } }), { didntSay: ['non_smokers'] }),
    placeMatch(place(8, { kind: 'room_in_flat', placeType: '2bhk', roomType: 'shared', rates: [{ sharing: null, rent: 12000, deposit: 24000 }], smokingAllowed: false }), { didntSay: ['veg_kitchen'] }),
  ],
  suggested: [],
}

/** No match in the budget: the suggested posts are the next band and a neighbouring area group (PD6c). */
export const sampleEmpty: ResultsPage = {
  results: [],
  suggested: [
    placeMatch(place(9, { kind: 'room_in_flat', placeType: '2bhk', roomType: 'private', rates: [{ sharing: null, rent: 28000, deposit: 56000 }] })),
    placeMatch(place(10, { kind: 'room_in_flat', placeType: '3bhk', roomType: 'shared', areaSlug: 'andheri-goregaon', rates: [{ sharing: null, rent: 14000, deposit: 28000 }] })),
  ],
}
