import { and, asc, eq, gt, inArray, isNull } from 'drizzle-orm'
import { sharingTypes, type ListingResponse } from '@roomsie/contract'
import type { Db } from '../db/client'
import { listingFlatmates, listingRates, listings, profiles } from '../db/schema'
import { noBlockBetween } from '../match/query'
import { firstPhotoUrl, type Storage } from '../storage'

export type Listing = typeof listings.$inferSelect
export type Rate = Pick<typeof listingRates.$inferSelect, 'sharing' | 'rent' | 'deposit'>
export type Flatmate = Pick<typeof listingFlatmates.$inferSelect, 'name' | 'age' | 'whatTheyDo' | 'food' | 'photoKey'>
export type Parts = { rates: Rate[]; flatmates: Flatmate[]; lister: Pick<typeof profiles.$inferSelect, 'fullName' | 'photoKeys'> | null }

/** A listing that the viewer can see: live, not expired, not hidden by reports, and no block between the viewer and the owner. */
export const visibleListing = (viewerUserId: string) => and(
  eq(listings.status, 'live'), gt(listings.expiresAt, new Date()), isNull(listings.hiddenAt), noBlockBetween(viewerUserId, listings.ownerUserId),
)

export async function partsOf(db: Db, ids: string[]) {
  const rates = await db.select().from(listingRates).where(inArray(listingRates.listingId, ids))
  const flatmates = await db.select().from(listingFlatmates).where(inArray(listingFlatmates.listingId, ids)).orderBy(asc(listingFlatmates.position))
  // The profile of the lister, in each state of the card. A card of a son or daughter is not the lister (T-16a).
  const listers = await db.select({ listingId: listings.id, fullName: profiles.fullName, photoKeys: profiles.photoKeys }).from(listings)
    .innerJoin(profiles, and(eq(profiles.userId, listings.ownerUserId), eq(profiles.managedByParent, false)))
    .where(inArray(listings.id, ids))
  return (id: string): Parts => ({
    rates: rates.filter((r) => r.listingId === id),
    flatmates: flatmates.filter((f) => f.listingId === id),
    lister: listers.find((l) => l.listingId === id) ?? null,
  })
}

export function listingView(listing: Listing, { rates, flatmates, lister }: Parts, storage: Storage, isOwner: boolean): ListingResponse {
  // The serializer parses each reply with the contract schema, which drops ownerUserId and the row ids.
  const { photoKeys, roomType, expiresAt, hiddenAt, createdAt, updatedAt, ...fields } = listing
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
    mine: isOwner,
    lister: lister && { name: lister.fullName, photoUrl: firstPhotoUrl(storage, lister.photoKeys) },
    hidden: hiddenAt !== null,
    expiresAt: expiresAt?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  }
}
