import {
  comparison, lifestyleAnswerLabels, listingTitle, moveInOf, personFacts, placeFacts,
  type CardFacts, type CardResponse, type CompareRequest, type Comparison, type LifestyleAxis, type PersonOption,
} from '@roomsie/contract'
import { catalogueOf } from '../assistant/catalogue'
import { listingSpot, type Spot } from '../geo/geo'
import { rupees } from '../assistant/handlers/reply/texts'
import type { Db } from '../db/client'
import { inOrder } from '../in-order'
import { partsOf, rowTitle, visibleListings, type Listing, type Parts } from '../listings/read'
import { answersFor, visibleCards, type Profile } from '../profiles/read'

function placeOf(listing: Listing, { rates, verified }: Parts) {
  // A live listing has a rent (T-41).
  const { rate, total } = moveInOf(rates, listing.brokerage)!
  const { id, maintenance, brokerage, nearestStation, walkStation, availableFrom, minStay, furnishing } = listing
  return { id, title: rowTitle(listing), rent: rate.rent, deposit: rate.deposit, moveInCash: total, maintenance, brokerage, nearestStation, walkStation, availableFrom, minStay, furnishing, verified }
}

/** Only what the card shows to others (PD16), never the hidden religion or community (PD3c), and never the bio. */
const personOf = ({ id, fullName, age, jobRole, whosMoving, budgetMin, budgetMax, moveDate }: Profile, { lifestyle, verified }: Pick<CardResponse, 'lifestyle' | 'verified'>): PersonOption =>
  ({ id, fullName, age, jobRole, whosMoving, budgetMin, budgetMax, moveDate, lifestyle, verified })

/**
 * A text of a lister or a person goes to a model only when it looks like a name: letters, digits and a few marks, at most 40.
 * So a station name passes, and an instruction cannot fit (PD10).
 */
const nameLike = (text: string | null) => (text && /^[\p{L}\p{N} .,'()&/-]{1,40}$/u.test(text.trim()) ? text.trim() : null)

const walkWords = { '5_min': 'about 5 minutes on foot', '10_min': 'about 10 minutes on foot', '15_min': 'about 15 minutes on foot', '30_min': 'about 30 minutes on foot', not_close: 'not close' } as const
const furnishingWords = { fully: 'Fully furnished', semi: 'Semi furnished', unfurnished: 'Unfurnished' } as const
/** "₹15,000 to ₹22,000", "under ₹25,000" or "from ₹35,000", as the card says a budget. */
const budgetWords = (min: number | null, max: number | null) =>
  (min === null && max === null ? null : min !== null && max !== null ? `${rupees(min)} to ${rupees(max)}` : max !== null ? `under ${rupees(max)}` : `from ${rupees(min!)}`)
const movingWords = { student: 'A student', first_job: 'Starting a first job', working: 'Working', couple: 'A couple', family: 'A family', friends: 'Friends', unclear: null } as const

/**
 * The selected cards of a question (T-49): their facts for the advisor, and with two cards or more the table of the comparison.
 * In the order of the request. Null: a card that the viewer cannot see, or a listing of the viewer.
 */
export async function cardsOf(db: Db, viewerUserId: string, { kind, ids }: CompareRequest): Promise<{ comparison: Comparison | null; facts: CardFacts[]; spots: (Spot | null)[] } | null> {
  const catalogue = await catalogueOf(db)
  const areaName = (slug: string | null) => (slug && catalogue.bySlug.get(slug)?.name) || null
  if (kind === 'person') {
    const [rows, answers] = await Promise.all([visibleCards(db, viewerUserId, ids), answersFor(db, ids)])
    if (rows.length !== ids.length) return null
    const ordered = inOrder(ids, rows)
    const options = ordered.map((row) => personOf(row, answers(row.id)))
    const facts = ordered.map((row, i) => personFacts.parse({
      ...(ids.length > 1 && { option: i + 1 }), age: row.age, job: nameLike(row.jobRole), whosMoving: movingWords[row.whosMoving],
      budget: budgetWords(row.budgetMin, row.budgetMax),
      moveDate: row.moveDate, areas: row.areas.flatMap((slug) => areaName(slug) ?? []),
      lifestyle: (Object.entries(options[i]!.lifestyle) as [LifestyleAxis, string][]).map(([axis, answer]) => (lifestyleAnswerLabels[axis] as Record<string, string>)[answer] ?? answer),
      verified: options[i]!.verified,
    }))
    // A trip starts at a place, never at a person.
    return { comparison: options.length > 1 ? comparison.parse({ kind, options }) : null, facts, spots: facts.map(() => null) }
  }
  // The results never show the own listing of the viewer, so a question about cards does not either.
  const [rows, parts] = await Promise.all([visibleListings(db, viewerUserId, ids, { notOwn: true }), partsOf(db, ids)])
  if (rows.length !== ids.length) return null
  const ordered = inOrder(ids, rows)
  const options = ordered.map((listing) => placeOf(listing, parts(listing.id)))
  const facts = ordered.map((listing, i) => {
    const option = options[i]!
    return placeFacts.parse({
      // The name of a PG is the lister's text, so a PG is only "PG".
      ...(ids.length > 1 && { option: i + 1 }), place: listing.kind === 'pg' ? 'PG' : listingTitle({ ...listing, pgName: null, roomType: listing.roomType === 'unclear' ? null : listing.roomType }),
      area: areaName(listing.areaSlug), nearestStation: nameLike(listing.nearestStation), walkToStation: listing.walkStation ? walkWords[listing.walkStation] : null,
      rent: option.rent, deposit: option.deposit, maintenance: option.maintenance, brokerage: option.brokerage, moveInCash: option.moveInCash,
      availableFrom: option.availableFrom, furnishing: listing.furnishing ? furnishingWords[listing.furnishing] : null, verified: option.verified,
    })
  })
  // The point of a card: its station, else its area. Its name is the name that the advisor gives it.
  const spots = ordered.map((listing, i) => listingSpot(ids.length > 1 ? `Option ${i + 1}` : 'This place', listing.nearestStation, listing.areaSlug))
  return { comparison: options.length > 1 ? comparison.parse({ kind, options }) : null, facts, spots }
}
