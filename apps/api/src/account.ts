import { eq, inArray } from 'drizzle-orm'
import type { Db } from './db/client'
import { anonymousSessions, goals, listingFlatmates, listings, profiles, users } from './db/schema'
import type { PhotoStore } from './storage'

/**
 * Removes the data of an account (PD19) and ends every session (ADR-0007).
 *
 * The `users` row stays as a tombstone: `status = 'deleted'` and a new
 * `tokens_valid_after`. Thus an old token gets a 401, and the other person in a
 * thread can still show "Deleted user". Reports and blocks keep their ids for
 * moderation.
 *
 * The photos go first. R2 deletes are idempotent, so if the database step fails,
 * a retry is safe. If the photos went last, a failure would leave photos that
 * no row points to.
 *
 * Not here yet: events (T-24), Form B (T-35), messages (T-44).
 */
export async function deleteAccount(db: Db, photos: PhotoStore, userId: string) {
  const ownListings = db.select({ id: listings.id }).from(listings).where(eq(listings.ownerUserId, userId))
  const [profilePhotos, listingPhotos, flatmatePhotos] = await Promise.all([
    db.select({ keys: profiles.photoKeys }).from(profiles).where(eq(profiles.userId, userId)),
    db.select({ keys: listings.photoKeys }).from(listings).where(eq(listings.ownerUserId, userId)),
    db.select({ key: listingFlatmates.photoKey }).from(listingFlatmates).where(inArray(listingFlatmates.listingId, ownListings)),
  ])
  await photos.deleteObjects([
    ...profilePhotos.flatMap((r) => r.keys),
    ...listingPhotos.flatMap((r) => r.keys),
    ...flatmatePhotos.flatMap((r) => (r.key ? [r.key] : [])),
  ])

  await db.transaction(async (tx) => {
    // The cascades remove the rates, the flatmates, the chat turns, the goals of a
    // claimed visitor session and the connection requests.
    await tx.delete(listings).where(eq(listings.ownerUserId, userId))
    await tx.delete(goals).where(eq(goals.userId, userId))
    await tx.delete(anonymousSessions).where(eq(anonymousSessions.claimedByUserId, userId))
    await tx.delete(profiles).where(eq(profiles.userId, userId))
    await tx.update(users).set({ status: 'deleted', tokensValidAfter: new Date(), updatedAt: new Date() }).where(eq(users.id, userId))
  })
}

/** A fresh sign-in after a deletion makes a new, empty account. The tombstone lets go of the
 *  provider id, so the old `users.id` never comes back to life. */
export function releaseTombstone(db: Db, userId: string) {
  return db.update(users).set({ authProviderId: `deleted:${userId}`, updatedAt: new Date() }).where(eq(users.id, userId))
}
