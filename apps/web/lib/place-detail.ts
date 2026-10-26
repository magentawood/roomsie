import type { ListingKind, ListingResponse } from '@roomsie/contract'
import { labels, rupees } from './listing-steps'

export type Line<L extends string = string> = { label: L; value: string }
type Flatmate = ListingResponse['flatmates'][number]

const yesNo = (v: boolean) => (v ? 'Yes' : 'No')
const setLines = <L extends string>(all: [L, string | null | undefined][]): Line<L>[] =>
  all.filter((l): l is [L, string] => l[1] != null).map(([label, value]) => ({ label, value }))
const when = <T>(v: T | null, text: (v: T) => string) => (v === null ? null : text(v))

/** The money to move in: the first rent, the deposit and the brokerage. A PG gives its lowest rent. */
export function moveIn(listing: ListingResponse) {
  const rate = listing.rates.toSorted((a, b) => a.rent - b.rent)[0]
  if (!rate) return null
  const rentLabel = listing.kind === 'pg' && rate.sharing ? `First month’s rent, ${labels.sharing[rate.sharing].toLowerCase()} sharing` : 'First month’s rent'
  return {
    lines: setLines([[rentLabel, rupees(rate.rent)], ['Deposit', when(rate.deposit, rupees)], ['Brokerage', when(listing.brokerage, rupees)]]),
    total: rupees(rate.rent + (rate.deposit ?? 0) + (listing.brokerage ?? 0)),
  }
}

const date = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })

export function termLines(l: ListingResponse) {
  const electricity = l.electricity === 'included' ? 'Included in rent' : when(l.electricity, (e) => labels.electricity[e])
  const maintenance = l.maintenanceIncluded ? 'Included in rent' : when(l.maintenance, (m) => `${rupees(m)}/mo`)
  return setLines([
    ['Electricity', electricity],
    ['Maintenance', maintenance],
    ['Rent', when(l.rentNegotiable, (n) => (n ? 'Negotiable' : 'Fixed'))],
    ['Minimum stay', when(l.minStay, (m) => labels.minStay[m])],
    ['Available from', when(l.availableFrom, date)],
  ])
}

const floor = (n: number) => (n === 0 ? 'Ground' : n < 0 ? `Basement ${-n}` : String(n))

/** The order of each kind follows its frame in the Product file. */
export function placeLines(l: ListingResponse) {
  const bathroom = when(l.bathroom, (b) => labels.bathroom[b])
  const balcony = when(l.balcony, yesNo)
  if (l.kind === 'pg') {
    return setLines([
      ['Beds free right now', when(l.bedsFree, (b) => labels.bedsFree[b])],
      ['Bathroom', bathroom],
      ['Meals', when(l.meals, (m) => labels.meals[m])],
      ['Balcony', balcony],
      ['Curfew', when(l.curfew, (c) => labels.curfew[c])],
    ])
  }
  const placeType = when(l.placeType, (p) => labels.placeType[p])
  const floorLine = when(l.floor, floor)
  const furnishing = when(l.furnishing, (f) => labels.furnishing[f])
  const area = when(l.carpetAreaSqft, (a) => `${a.toLocaleString('en-IN')} sq ft`)
  if (l.kind === 'room_in_flat') {
    return setLines([
      ['Place type', placeType], ['Floor', floorLine], ['The room', when(l.roomType, (r) => labels.roomType[r])], ['Carpet area', area],
      ['Bathroom for this room', bathroom], ['Balcony', balcony], ['Furnishing', furnishing],
    ])
  }
  return setLines([['Place type', placeType], ['Floor', floorLine], ['Furnishing', furnishing], ['Carpet area', area], ['Bathroom', bathroom], ['Balcony', balcony]])
}

/** The rent and the deposit of each sharing of a PG. */
export function pgRateLines(l: ListingResponse): Line[] {
  return l.rates.flatMap((r) => (r.sharing
    ? [{ label: `${labels.sharing[r.sharing]} sharing`, value: `${rupees(r.rent)}/mo${r.deposit === null ? '' : ` · deposit ${rupees(r.deposit)}`}` }]
    : []))
}

export function ruleLines(l: ListingResponse) {
  return setLines([
    ['Kitchen', when(l.vegOnlyKitchen, (v) => (v ? 'Veg only' : 'Veg and non-veg'))],
    ['Guests', when(l.guests, (g) => labels.guestsRule[g])],
    ['Smoking', when(l.smokingAllowed, (s) => (s ? 'Smoking allowed' : 'No smoking'))],
    ['Who can move in', when(l.whoCanMoveIn, (w) => labels.whoCanMoveIn[w])],
    ['Alcohol', when(l.alcoholAllowed, (a) => (a ? 'Alcohol allowed' : 'No alcohol at home'))],
    ['Who’s welcome', l.whoIsWelcome.length ? l.whoIsWelcome.map((w) => labels.whoIsWelcome[w]).join(', ') : null],
  ])
}

export function nearbyLines(l: ListingResponse) {
  const walk = (w: ListingResponse['walkBus']) => when(w, (t) => labels.walkTime[t])
  const station = walk(l.walkStation)
  return setLines([
    ['Railway or metro station', l.nearestStation && station ? `${l.nearestStation} · ${station}` : station],
    ['Bus stop', walk(l.walkBus)],
    ['Market or groceries', walk(l.walkMarket)],
    ['Gym', walk(l.walkGym)],
    ['Mall', walk(l.walkMall)],
  ])
}

/** The label of each line of the place, the rules and what is nearby. */
export type FactLabel = ReturnType<typeof placeLines | typeof ruleLines | typeof nearbyLines>[number]['label']

export function flatmateLines(f: Flatmate) {
  const about = [f.whatTheyDo, f.food && labels.food[f.food]].filter(Boolean).join(' · ')
  return { name: f.age === null ? f.name : `${f.name}, ${f.age}`, about: about || null }
}

/** "Orchid Residency, Andheri–Goregaon • Next to the municipal school". The API sends the address only when the lister shares it (ADR-0017). */
export function whereLine(l: ListingResponse, areaName: string | undefined) {
  const place = [l.address ?? l.building, areaName].filter(Boolean).join(', ')
  return [place, l.landmark].filter(Boolean).join(' • ') || null
}

/** TODO(T-16a): the name and the photo of the lister. */
export const listerLabel = (kind: ListingKind) =>
  ({ owner_flat: 'Owner', broker_flat: 'Broker', pg: 'PG operator', room_in_flat: 'Flatmate' })[kind]
