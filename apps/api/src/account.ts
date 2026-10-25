import { createHash } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { Db } from './db/client'
import { anonymousSessions, blocks, goals, listingFlatmates, listings, profiles, reports, users } from './db/schema'
import type { Storage } from './storage'

/** A tombstone keeps a hash of the Firebase uid, never the uid. Firebase uids are
 *  random, so a plain SHA-256 cannot be reversed by a guess. */
export const tombstoneKey = (uid: string) => `deleted:${createHash('sha256').update(uid).digest('hex')}`

/**
 * Removes the data of an account (PD19) and ends every session (ADR-0007).
 *
 * The `users` row stays as a tombstone: `status = 'deleted'`, a new
 * `tokens_valid_after`, and the hash of the uid. Thus an old token gets a 401,
 * and the other person in a thread can still show "Deleted user". Reports and
 * blocks keep their ids for moderation.
 *
 * Order: hide, then the photos, then the rows. R2 deletes are idempotent, so if
 * the database step fails, a retry is safe, and the hidden card shows no broken
 * image meanwhile. If the photos went last, a failure would leave photos that no
 * row points to.
 *
 * Not here yet: events (T-24), Form B (T-35), messages (T-44), the Firebase user (T-53).
 */
export async function deleteAccount(db: Db, storage: Pick<Storage, 'deleteObjects'>, userId: string) {
  await db.update(profiles).set({ visibility: 'hidden', updatedAt: new Date() }).where(eq(profiles.userId, userId))
  await db.update(listings).set({ status: 'inactive', updatedAt: new Date() })
    .where(and(eq(listings.ownerUserId, userId), eq(listings.status, 'live')))

  const [profilePhotos, listingPhotos] = await Promise.all([
    db.select({ keys: profiles.photoKeys }).from(profiles).where(eq(profiles.userId, userId)),
    db.select({ keys: listings.photoKeys, flatmate: listingFlatmates.photoKey }).from(listings)
      .leftJoin(listingFlatmates, eq(listingFlatmates.listingId, listings.id))
      .where(eq(listings.ownerUserId, userId)),
  ])
  await storage.deleteObjects([...new Set([
    ...profilePhotos.flatMap((r) => r.keys),
    ...listingPhotos.flatMap((r) => (r.flatmate ? [...r.keys, r.flatmate] : r.keys)),
  ])])

  await db.transaction(async (tx) => {
    // The cascades remove the rates, the flatmates, the chat turns, the goals of a
    // claimed visitor session and the connection requests.
    await tx.delete(listings).where(eq(listings.ownerUserId, userId))
    await tx.delete(goals).where(eq(goals.userId, userId))
    await tx.delete(anonymousSessions).where(eq(anonymousSessions.claimedByUserId, userId))
    await tx.delete(profiles).where(eq(profiles.userId, userId))
    const [user] = await tx.select({ uid: users.authProviderId, status: users.status }).from(users).where(eq(users.id, userId)).for('update')
    await tx.update(users).set({
      status: 'deleted',
      authProviderId: tombstoneKey(user!.uid),
      // Whole seconds, like auth_time: a sign-in in the same second as the deletion counts as after it.
      tokensValidAfter: new Date(Math.floor(Date.now() / 1000) * 1000),
      rejoinBlocked: user!.status === 'suspended',
      updatedAt: new Date(),
    }).where(eq(users.id, userId))
  })
}

/**
 * A fresh sign-in with the uid of a tombstone. A tombstone of a suspended account,
 * or one with an open report, cannot rejoin. Otherwise the person gets a new, empty
 * account, and each block against the old account moves to it. The tombstone lets go
 * of the uid hash, so the old `users.id` never comes back to life.
 */
export async function rejoin(db: Db, tombstoneId: string, uid: string, signedInAt: Date) {
  return db.transaction(async (tx) => {
    const [tombstone] = await tx.select({ key: users.authProviderId, rejoinBlocked: users.rejoinBlocked })
      .from(users).where(eq(users.id, tombstoneId)).for('update')
    // A second request at the same time waited on the lock: the first one already rejoined.
    if (tombstone?.key !== tombstoneKey(uid)) return 'rejoined' as const
    const [openReport] = await tx.select({ id: reports.id }).from(reports)
      .where(and(eq(reports.subjectUserId, tombstoneId), eq(reports.status, 'open'))).limit(1)
    if (tombstone.rejoinBlocked || openReport) return 'blocked' as const

    await tx.update(users).set({ authProviderId: `deleted:${tombstoneId}`, updatedAt: new Date() }).where(eq(users.id, tombstoneId))
    const [user] = await tx.insert(users).values({ authProviderId: uid, tokensValidAfter: signedInAt }).returning({ id: users.id })
    const blockers = await tx.select({ blockerUserId: blocks.blockerUserId }).from(blocks).where(eq(blocks.blockedUserId, tombstoneId))
    if (blockers.length > 0) {
      await tx.insert(blocks).values(blockers.map((b) => ({ id: uuidv7(), blockerUserId: b.blockerUserId, blockedUserId: user!.id })))
        .onConflictDoNothing()
    }
    return 'rejoined' as const
  })
}
