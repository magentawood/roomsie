import { comparison, listingTitle, type CompareRequest, type Comparison } from '@roomsie/contract'
import type { Db } from '../db/client'
import { inOrder } from '../in-order'
import { partsOf, visibleListings, type Listing, type Parts } from '../listings/read'
import { answersFor, cardView, visibleCards } from '../profiles/read'
import type { Storage } from '../storage'

/** One month of rent, the deposit, and the brokerage of a broker flat. A PG gives its lowest rent and the deposit of that rent. */
function placeOf(listing: Listing, { rates, verified }: Parts) {
  const [rate] = rates.toSorted((a, b) => a.rent - b.rent)
  if (!rate) return null
  const title = listingTitle({ ...listing, roomType: listing.roomType === 'unclear' ? null : listing.roomType })
  return { ...listing, title, rent: rate.rent, deposit: rate.deposit, moveInCash: rate.rent + (rate.deposit ?? 0) + (listing.brokerage ?? 0), verified }
}

/**
 * The table of the selected cards that the viewer can see, in the order of the request (T-49). Null: a card that the viewer
 * cannot see. The contract keeps only the fields of the table, so a person gives only what the card shows to others.
 */
export async function comparisonOf(db: Db, storage: Storage, viewerUserId: string, { kind, ids }: CompareRequest): Promise<Comparison | null> {
  if (kind === 'person') {
    const [rows, answers] = await Promise.all([visibleCards(db, viewerUserId, ids), answersFor(db, ids)])
    return rows.length === ids.length ? comparison.parse({ kind, options: inOrder(ids, rows).map((row) => cardView(row, answers(row.id), storage)) }) : null
  }
  const [rows, parts] = await Promise.all([visibleListings(db, viewerUserId, ids), partsOf(db, ids)])
  const options = inOrder(ids, rows).map((listing) => placeOf(listing, parts(listing.id)))
  return rows.length === ids.length && options.every(Boolean) ? comparison.parse({ kind, options }) : null
}
