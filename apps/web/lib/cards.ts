import type { CardResponse, ListingResponse } from '@roomsie/contract'
import type { Tone } from '../components/ui/badge'
import { labels } from './listing-steps'
import { budgetLine, lifestyleLines, lookingFor } from './person'
import { shortDate } from './place-detail'

/*
 * The lines of the place and person cards of the designs (frame "All types of cards and listings", 67:6750).
 * Each line comes from a field of the listing or the card. A line with no value does not show: a card never says "Didn't say".
 */

/** The icon of a line, as the designs draw it. The card maps each key to its icon. */
export type FactIcon = 'area' | 'people' | 'date' | 'type' | 'sharing' | 'meals' | 'looking' | 'budget'
/** One line with an icon. `label`: the grey words before the value, as "Available from:". */
export type Fact = { icon: FactIcon; label?: string; value: string }
/** The tags line: the first three values, and the count of the rest ("+3"). */
export type Tags = { shown: string[]; more: number }

const has = <T>(fact: T | null | undefined | false): fact is T => Boolean(fact)

/**
 * Up to three values, while the line fits a card of the computer: 44 characters of 12 px text in its 266 px. The first value
 * always shows, and the card cuts a longer line with "…".
 */
export function tagLine(values: (string | null | undefined)[], count = 3, chars = 44): Tags | null {
  const all = values.filter(has)
  if (!all.length) return null
  const length = (n: number) => all.slice(0, n).join(' • ').length + (all.length > n ? ` +${all.length - n}`.length : 0)
  let shown = 1
  while (shown < Math.min(count, all.length) && length(shown + 1) <= chars) shown += 1
  return { shown: all.slice(0, shown), more: all.length - shown }
}

/** The type of a PG, as the PGs of Mumbai name it. */
const pgTypes = { men: 'Boys', women: 'Girls', any: 'Boys and girls' } as const
const moveInTags = { men: 'Men only', women: 'Women only', any: 'Any gender' } as const
const yesNo = (value: boolean | null, yes: string, no: string) => (value === null ? null : value ? yes : no)

/** The house rules, in the order of the room card of the designs: "No smoking • Veg kitchen • Guests welcome". */
function ruleTags(listing: ListingResponse) {
  return {
    smoking: yesNo(listing.smokingAllowed, 'Smoking allowed', 'No smoking'),
    kitchen: yesNo(listing.vegOnlyKitchen, 'Veg kitchen', 'Veg and non-veg'),
    guests: listing.guests && labels.guestsRule[listing.guests],
    alcohol: yesNo(listing.alcoholAllowed, 'Alcohol allowed', 'No alcohol'),
    moveIn: listing.whoCanMoveIn && moveInTags[listing.whoCanMoveIn],
  }
}

/** The tags line of a place: the house rules of a room, and the furnishing and the bathroom of a flat first, as the designs. */
export function placeTags(listing: ListingResponse) {
  const rules = ruleTags(listing)
  const bathroom = listing.bathroom && labels.bathroom[listing.bathroom]
  if (listing.kind === 'room_in_flat') return tagLine([rules.smoking, rules.kitchen, rules.guests, rules.alcohol, rules.moveIn])
  if (listing.kind === 'pg') {
    const curfew = listing.curfew && (listing.curfew === 'none' ? labels.curfew.none : `Curfew ${labels.curfew[listing.curfew]}`)
    return tagLine([bathroom, rules.guests, curfew, rules.smoking, rules.kitchen, rules.alcohol])
  }
  const furnishing = listing.furnishing && labels.furnishing[listing.furnishing]
  return tagLine([furnishing, bathroom, rules.guests, rules.smoking, rules.kitchen, rules.alcohol, rules.moveIn])
}

/** A line, or null when its field has no value. */
const fact = (icon: FactIcon, value: string | null | undefined | false, label?: string): Fact | null => (value ? { icon, value, ...(label && { label }) } : null)

/**
 * The lines under the title of a place. A room: the people that it takes and the date. A PG: its type, sharing and meals.
 * A flat: the area only, as the designs. Only a private room says how many people it takes: one.
 */
export function placeFacts(listing: ListingResponse, areaName: string | undefined): Fact[] {
  const area = fact('area', areaName)
  if (listing.kind === 'room_in_flat') {
    return [
      area,
      fact('people', listing.roomType === 'private' && '1 person', 'Accommodation:'),
      fact('date', listing.availableFrom && shortDate(listing.availableFrom), 'Available from:'),
    ].filter(has)
  }
  if (listing.kind === 'pg') {
    const welcome = listing.whoIsWelcome.map((w) => labels.whoIsWelcome[w]).join(', ')
    const type = [listing.whoCanMoveIn && pgTypes[listing.whoCanMoveIn], welcome && `${welcome} welcome`].filter(has).join(' • ')
    return [
      area,
      fact('type', type, 'Type:'),
      fact('sharing', listing.sharing.map((s) => labels.sharing[s]).join(', '), 'Sharing:'),
      fact('meals', listing.meals && labels.meals[listing.meals], 'Meals:'),
    ].filter(has)
  }
  return [area].filter(has)
}

/**
 * The pill beside the title of a place card. A verified lister gets the check: "Verified" on a room, "Owner" on a flat or a PG,
 * and "Broker" on a broker flat. A broker flat always says "Broker", so the brokerage is never a surprise.
 */
export function placeBadge({ kind, verified }: Pick<ListingResponse, 'kind' | 'verified'>): { label: string; tone: Tone; verified: boolean } | null {
  if (kind === 'broker_flat') return { label: 'Broker', tone: 'warning', verified }
  if (!verified) return null
  return { label: kind === 'room_in_flat' ? 'Verified' : 'Owner', tone: 'success', verified }
}

/** The faces on the photo of a room: the first three flatmates, those with a photo first. */
export const flatmateFaces = (listing: ListingResponse) =>
  listing.kind === 'room_in_flat' ? listing.flatmates.toSorted((a, b) => Number(!a.photoUrl) - Number(!b.photoUrl)).slice(0, 3) : []

/** The lines of a person card: what they look for, the budget and the move date. */
export const personFacts = (card: CardResponse): Fact[] => [
  fact('looking', lookingFor(card), 'Looking for:'),
  fact('budget', budgetLine(card)),
  fact('date', card.moveDate && shortDate(card.moveDate), 'Available from:'),
].filter(has)

/** "Non-smoker • Guests welcome • Night owl +3": the lifestyle answers of a person. */
export const personTags = (card: CardResponse) => tagLine(lifestyleLines(card).map((l) => l.value))
