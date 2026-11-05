import { and, asc, count, desc, eq, gt, ilike, inArray, isNotNull, isNull, ne, or, sql } from 'drizzle-orm'
import { listingTitle, sharingTypes, type ListingResponse } from '@roomsie/contract'
import { noBlockBetween } from '../blocks/read'
import type { Db, Tx } from '../db/client'
import { listingFlatmates, listingRates, listings } from '../db/schema'
import { profilesOfUsers, type Profile } from '../profiles/read'
import { firstPhotoUrl, type Storage } from '../storage'
import { activeAccount } from '../users'
import { verifiedIds } from '../verification/read'

export type Listing = typeof listings.$inferSelect
export type Rate = Pick<typeof listingRates.$inferSelect, 'sharing' | 'rent' | 'deposit'>
export type Flatmate = Pick<typeof listingFlatmates.$inferSelect, 'name' | 'age' | 'whatTheyDo' | 'food' | 'photoKey'>
/** `verified`: the owner has an approved ID check (T-46). */
export type Parts = { rates: Rate[]; flatmates: Flatmate[]; lister: Pick<Profile, 'fullName' | 'photoKeys'> | null; verified: boolean }

/** A listing that the viewer can see: live, not expired, not hidden by reports, not removed by a moderator, and no block between the viewer and the owner. A guest has no blocks. */
export const visibleListing = (viewerUserId?: string) => and(
  eq(listings.status, 'live'), gt(listings.expiresAt, new Date()), isNull(listings.hiddenAt), isNull(listings.removedAt),
  viewerUserId ? noBlockBetween(viewerUserId, listings.ownerUserId) : undefined,
)

export async function partsOf(db: Db, ids: string[]) {
  const rates = await db.select().from(listingRates).where(inArray(listingRates.listingId, ids))
  const flatmates = await db.select().from(listingFlatmates).where(inArray(listingFlatmates.listingId, ids)).orderBy(asc(listingFlatmates.position))
  const owners = await db.select({ id: listings.id, userId: listings.ownerUserId }).from(listings).where(inArray(listings.id, ids))
  // The profile of the lister, in each state of the card. A card of a son or daughter is not the lister (T-16a).
  const listers = (await profilesOfUsers(db, owners.map((o) => o.userId))).filter((p) => !p.managedByParent)
  const ownerOf = new Map(owners.map((o) => [o.id, o.userId]))
  const listerOf = new Map(listers.map((p) => [p.userId, p]))
  const verified = await verifiedIds(db, owners)
  return (id: string): Parts => ({
    rates: rates.filter((r) => r.listingId === id),
    flatmates: flatmates.filter((f) => f.listingId === id),
    lister: listerOf.get(ownerOf.get(id)!) ?? null,
    verified: verified.has(id),
  })
}

export function listingView(listing: Listing, { rates, flatmates, lister, verified }: Parts, storage: Storage, isOwner: boolean): ListingResponse {
  // The serializer parses each reply with the contract schema, which drops ownerUserId and the row ids.
  const { photoKeys, roomType, expiresAt, hiddenAt, removedAt, createdAt, updatedAt, ...fields } = listing
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
    verified,
    hidden: hiddenAt !== null,
    removed: removedAt !== null,
    expiresAt: expiresAt?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  }
}

/** The listings of these ids that the viewer can see. `notOwn`: not the own listings of the viewer. */
export const visibleListings = (db: Db, viewerUserId: string, ids: string[], { notOwn = false } = {}) =>
  db.select().from(listings).where(and(inArray(listings.id, ids), visibleListing(viewerUserId), notOwn ? ne(listings.ownerUserId, viewerUserId) : undefined))

/** The listings of these ids, in each state. */
export const listingsByIds = (db: Db | Tx, ids: string[]) => db.select().from(listings).where(inArray(listings.id, ids))

/**
 * The owner of a listing that the viewer can see and does not own. `activeOwner`: only when the owner's account is active.
 * A caller can add `.for('update')`.
 */
export const ownerOfVisibleListing = (db: Db | Tx, listingId: string, viewerUserId: string, { activeOwner = false } = {}) =>
  db.select({ userId: listings.ownerUserId }).from(listings).where(and(
    eq(listings.id, listingId), visibleListing(viewerUserId), activeOwner ? activeAccount(listings.ownerUserId) : undefined, ne(listings.ownerUserId, viewerUserId),
  ))

/** The title of a row, whose room type can be `unclear`. */
export const rowTitle = (listing: Pick<Listing, 'kind' | 'pgName' | 'placeType' | 'roomType'>) =>
  listingTitle({ ...listing, roomType: listing.roomType === 'unclear' ? null : listing.roomType })

export async function titleOf(db: Db, listingId: string) {
  const [listing] = await db.select({ kind: listings.kind, pgName: listings.pgName, placeType: listings.placeType, roomType: listings.roomType })
    .from(listings).where(eq(listings.id, listingId))
  return listing && rowTitle(listing)
}

/** A report or a moderator hides a listing for review (T-19); a dismiss shows it again. */
export const setListingHiddenForReview = (tx: Tx, listingId: string, hiddenAt: Date | null) => tx.update(listings).set({ hiddenAt }).where(eq(listings.id, listingId))

/** Hides the listing for review, unless it is hidden already: the first hide keeps its time. */
export const hideListingForReview = (tx: Tx, listingId: string) =>
  tx.update(listings).set({ hiddenAt: new Date() }).where(and(eq(listings.id, listingId), isNull(listings.hiddenAt)))

/** At a suspension: each listing of the person. */
export const hideListingsOf = (tx: Tx, userId: string, at: Date) => tx.update(listings).set({ hiddenAt: at }).where(eq(listings.ownerUserId, userId))

/* At an account deletion (T-20). */
export const deactivateListingsOf = (db: Db, userId: string) =>
  db.update(listings).set({ status: 'inactive', updatedAt: new Date() }).where(and(eq(listings.ownerUserId, userId), eq(listings.status, 'live')))
/** The photos of the listings and of their flatmates. */
export async function listingPhotoKeysOf(tx: Tx, userId: string) {
  const rows = await tx.select({ keys: listings.photoKeys, flatmate: listingFlatmates.photoKey }).from(listings)
    .leftJoin(listingFlatmates, eq(listingFlatmates.listingId, listings.id))
    .where(eq(listings.ownerUserId, userId))
  return rows.flatMap((r) => (r.flatmate ? [...r.keys, r.flatmate] : r.keys))
}
/** The cascades remove the rates and the flatmates. */
export const deleteListingsOf = (tx: Tx, userId: string) => tx.delete(listings).where(eq(listings.ownerUserId, userId))

/** A take-down by a moderator (T-63): the listing hides from everyone but its owner, and cannot go live again. */
export const setListingRemoved = (tx: Tx, listingId: string, at: Date) => tx.update(listings).set({ removedAt: at }).where(eq(listings.id, listingId))

/** The newest listings for the admin: all of them, the hidden ones, the removed ones, or those in some areas or of some owners. */
export const newestListings = (db: Db, limit: number, { hidden = false, removed = false, areaSlugs, ownerIds }: { hidden?: boolean; removed?: boolean; areaSlugs?: string[]; ownerIds?: string[] } = {}) =>
  db.select().from(listings).where(and(
    hidden ? isNotNull(listings.hiddenAt) : undefined, removed ? isNotNull(listings.removedAt) : undefined,
    areaSlugs || ownerIds ? or(areaSlugs?.length ? inArray(listings.areaSlug, areaSlugs) : undefined, ownerIds?.length ? inArray(listings.ownerUserId, ownerIds) : undefined, sql`false`) : undefined,
  )).orderBy(desc(listings.createdAt)).limit(limit)

/** The live listings that people see, and the hidden ones, for the admin home. */
export async function listingCounts(db: Db) {
  const [row] = await db.select({
    live: sql<number>`count(*) filter (where ${visibleListing()})`.mapWith(Number),
    hidden: sql<number>`count(*) filter (where ${and(isNotNull(listings.hiddenAt), isNull(listings.removedAt))})`.mapWith(Number),
  }).from(listings)
  return row!
}
