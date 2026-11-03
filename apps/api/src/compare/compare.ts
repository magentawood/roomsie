import { comparison, moveInOf, type CardResponse, type CompareRequest, type Comparison, type PersonOption } from '@roomsie/contract'
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

/** The table of the selected cards, in the order of the request (T-49). Null: a card that the viewer cannot see, or a listing of the viewer. */
export async function comparisonOf(db: Db, viewerUserId: string, { kind, ids }: CompareRequest): Promise<Comparison | null> {
  if (kind === 'person') {
    const [rows, answers] = await Promise.all([visibleCards(db, viewerUserId, ids), answersFor(db, ids)])
    return rows.length === ids.length ? comparison.parse({ kind, options: inOrder(ids, rows).map((row) => personOf(row, answers(row.id))) }) : null
  }
  // The results never show the own listing of the viewer, so a comparison does not either.
  const [rows, parts] = await Promise.all([visibleListings(db, viewerUserId, ids, { notOwn: true }), partsOf(db, ids)])
  return rows.length === ids.length ? comparison.parse({ kind, options: inOrder(ids, rows).map((listing) => placeOf(listing, parts(listing.id))) }) : null
}
