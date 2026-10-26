import { and, asc, eq, gt, inArray } from 'drizzle-orm'
import { sharingTypes, type ListingResponse } from '@roomsie/contract'
import type { Db } from '../db/client'
import { listingFlatmates, listingRates, listings } from '../db/schema'
import type { Storage } from '../storage'

export type Listing = typeof listings.$inferSelect
export type Rate = Pick<typeof listingRates.$inferSelect, 'sharing' | 'rent' | 'deposit'>
export type Flatmate = Pick<typeof listingFlatmates.$inferSelect, 'name' | 'age' | 'whatTheyDo' | 'food' | 'photoKey'>
export type Parts = { rates: Rate[]; flatmates: Flatmate[] }

/** A listing that other users can see: live, and not expired. `visibleListing` is the same rule in SQL. */
export const isVisible = (listing: Listing) => listing.status === 'live' && listing.expiresAt! > new Date()
export const visibleListing = () => and(eq(listings.status, 'live'), gt(listings.expiresAt, new Date()))

/** The rents and the flatmates of each listing, from two queries. */
export async function partsOf(db: Db, ids: string[]) {
  const rates = await db.select().from(listingRates).where(inArray(listingRates.listingId, ids))
  const flatmates = await db.select().from(listingFlatmates).where(inArray(listingFlatmates.listingId, ids)).orderBy(asc(listingFlatmates.position))
  return (id: string): Parts => ({
    rates: rates.filter((r) => r.listingId === id),
    flatmates: flatmates.filter((f) => f.listingId === id),
  })
}

export function listingView(listing: Listing, { rates, flatmates }: Parts, storage: Storage, isOwner: boolean): ListingResponse {
  // The serializer parses each reply with the contract schema, which drops ownerUserId and the row ids.
  const { photoKeys, roomType, expiresAt, createdAt, updatedAt, ...fields } = listing
  const hideAddress = !isOwner && !listing.shareAddress
  const sharingOrder = (r: Rate) => (r.sharing ? sharingTypes.indexOf(r.sharing) : -1)
  return {
    ...fields,
    // ADR-0017: until the lister shares the address, other users see the area, the landmark and the building.
    ...(hideAddress && { address: null, street: null, pincode: null }),
    roomType: roomType === 'unclear' ? null : roomType,
    photos: photoKeys.map((key) => ({ key, url: storage.publicUrl(key) })),
    rates: [...rates].sort((a, b) => sharingOrder(a) - sharingOrder(b)),
    flatmates: flatmates.map((f) => ({ ...f, photoUrl: f.photoKey && storage.publicUrl(f.photoKey) })),
    expiresAt: expiresAt?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  }
}
