import { moveInOf, type ListingKind, type ListingResponse } from '@roomsie/contract'
import { labels, rupees } from './listing-steps'

export type Line<L extends string = string> = { label: L; value: string }
type Flatmate = ListingResponse['flatmates'][number]

/** The value of a field that the lister or the person left empty. Each field of a kind shows, so a gap is plain (2026-11-09). */
export const didntSay = 'Didn’t say'

const linesOf = <L extends string>(all: [L, string | null | undefined][]): Line<L>[] => all.map(([label, value]) => ({ label, value: value ?? didntSay }))
export const ifSet = <T>(v: T | null, text: (v: T) => string) => (v === null ? null : text(v))

/** The lines of the money to move in (`moveInOf`). Only a broker flat has a brokerage. With no rent there is no total. */
export function moveIn(listing: ListingResponse) {
  const money = moveInOf(listing.rates, listing.brokerage)
  const rate = money?.rate
  const rentLabel = listing.kind === 'pg' && rate?.sharing ? `First month’s rent, ${labels.sharing[rate.sharing].toLowerCase()} sharing` : 'First month’s rent'
  return {
    lines: linesOf([
      [rentLabel, rate && rupees(rate.rent)], ['Deposit', rate && ifSet(rate.deposit, rupees)],
      ...(listing.kind === 'broker_flat' ? [['Brokerage', ifSet(listing.brokerage, rupees)] as [string, string | null]] : []),
    ]),
    total: money ? rupees(money.total) : null,
  }
}

/** "1 Nov 26". */
export const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })

/** A PG has no amount of maintenance and no date to move in (the listing flow, T-41). */
export function termLines(listing: ListingResponse) {
  const electricity = listing.electricity === 'included' ? 'Included in rent' : ifSet(listing.electricity, (e) => labels.electricity[e])
  const maintenance = listing.maintenanceIncluded ? 'Included in rent'
    : listing.maintenance !== null ? `${rupees(listing.maintenance)}/mo` : listing.maintenanceIncluded === false ? 'Not included' : null
  return linesOf([
    ['Electricity', electricity],
    ['Maintenance', maintenance],
    ['Rent', ifSet(listing.rentNegotiable, (n) => (n ? 'Negotiable' : 'Fixed'))],
    ['Minimum stay', ifSet(listing.minStay, (m) => labels.minStay[m])],
    ...(listing.kind === 'pg' ? [] : [['Available from', ifSet(listing.availableFrom, shortDate)] as ['Available from', string | null]]),
  ])
}

const floor = (n: number) => (n === 0 ? 'Ground' : n < 0 ? `Basement ${-n}` : String(n))

/** The order of each kind follows its frame in the Product file. */
export function placeLines(listing: ListingResponse) {
  const bathroom = ifSet(listing.bathroom, (b) => labels.bathroom[b])
  const balcony = ifSet(listing.balcony, (b) => (b ? 'Yes' : 'No'))
  if (listing.kind === 'pg') {
    return linesOf([
      ['Beds free right now', ifSet(listing.bedsFree, (b) => labels.bedsFree[b])],
      ['Bathroom', bathroom],
      ['Meals', ifSet(listing.meals, (m) => labels.meals[m])],
      ['Balcony', balcony],
      ['Curfew', ifSet(listing.curfew, (c) => labels.curfew[c])],
    ])
  }
  const placeType = ifSet(listing.placeType, (p) => labels.placeType[p])
  const floorLine = ifSet(listing.floor, floor)
  const furnishing = ifSet(listing.furnishing, (f) => labels.furnishing[f])
  const area = ifSet(listing.carpetAreaSqft, (a) => `${a.toLocaleString('en-IN')} sq ft`)
  if (listing.kind === 'room_in_flat') {
    return linesOf([
      ['Place type', placeType], ['Floor', floorLine], ['The room', ifSet(listing.roomType, (r) => labels.roomType[r])], ['Carpet area', area],
      ['Bathroom for this room', bathroom], ['Balcony', balcony], ['Furnishing', furnishing],
    ])
  }
  return linesOf([['Place type', placeType], ['Floor', floorLine], ['Furnishing', furnishing], ['Carpet area', area], ['Bathroom', bathroom], ['Balcony', balcony]])
}

/** The rent and the deposit of each sharing of a PG, and "Didn't say" for a sharing with no rent. */
export function pgRateLines(listing: ListingResponse): Line[] {
  const rates = listing.rates.flatMap((r) => (r.sharing
    ? [{ label: `${labels.sharing[r.sharing]} sharing`, value: `${rupees(r.rent)}/mo${r.deposit === null ? '' : ` · deposit ${rupees(r.deposit)}`}` }]
    : []))
  const unpriced = listing.sharing.filter((sharing) => !listing.rates.some((r) => r.sharing === sharing)).map((sharing) => ({ label: `${labels.sharing[sharing]} sharing`, value: didntSay }))
  const lines = [...rates, ...unpriced]
  return lines.length ? lines : [{ label: 'Sharing', value: didntSay }]
}

export function ruleLines(listing: ListingResponse) {
  return linesOf([
    ['Kitchen', ifSet(listing.vegOnlyKitchen, (v) => (v ? 'Veg only' : 'Veg and non-veg'))],
    ['Guests', ifSet(listing.guests, (g) => labels.guestsRule[g])],
    ['Smoking', ifSet(listing.smokingAllowed, (s) => (s ? 'Smoking allowed' : 'No smoking'))],
    ['Who can move in', ifSet(listing.whoCanMoveIn, (w) => labels.whoCanMoveIn[w])],
    ['Alcohol', ifSet(listing.alcoholAllowed, (a) => (a ? 'Alcohol allowed' : 'No alcohol at home'))],
    ['Who’s welcome', listing.whoIsWelcome.length ? listing.whoIsWelcome.map((w) => labels.whoIsWelcome[w]).join(', ') : null],
  ])
}

/** The order of the frames, which read in rows of two. */
export function nearbyLines(listing: ListingResponse) {
  const walk = (w: ListingResponse['walkBus']) => ifSet(w, (t) => labels.walkTime[t])
  const station = walk(listing.walkStation)
  return linesOf([
    ['Railway or metro station', [listing.nearestStation, station].filter(Boolean).join(' · ') || null],
    ['Gym', walk(listing.walkGym)],
    ['Bus stop', walk(listing.walkBus)],
    ['Mall', walk(listing.walkMall)],
    ['Market or groceries', walk(listing.walkMarket)],
  ])
}

/** The label of each line of the place, the rules and what is nearby. */
export type FactLabel = ReturnType<typeof placeLines | typeof ruleLines | typeof nearbyLines>[number]['label']

export function flatmateLines(f: Flatmate) {
  const about = [f.whatTheyDo, f.food && labels.food[f.food]].filter(Boolean).join(' · ')
  return { name: f.age === null ? f.name : `${f.name}, ${f.age}`, about: about || null }
}

export function whereLine(listing: ListingResponse, areaName: string | undefined) {
  const place = [listing.building, areaName].filter(Boolean).join(', ')
  return [place, listing.landmark].filter(Boolean).join(' • ') || null
}

/** The API sends the address, the street and the pincode only when the lister shares them (ADR-0017). */
export const addressLine = (listing: ListingResponse) => [listing.address, listing.street, listing.pincode].filter(Boolean).join(', ') || null

/** The kind of lister, under the name, or alone when the lister has no profile. */
export const listerLabel = (kind: ListingKind) =>
  ({ owner_flat: 'Owner', broker_flat: 'Broker', pg: 'PG operator', room_in_flat: 'Flatmate' })[kind]

/** The lister in the message button of the listing details: "Message the owner". */
export const listerPhrase = (kind: ListingKind) => ({ owner_flat: 'the owner', broker_flat: 'the broker', pg: 'the PG/Hostel', room_in_flat: 'the flatmate' })[kind]
