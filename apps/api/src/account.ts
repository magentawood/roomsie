import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { deletePushTokensOf } from './alerts/read'
import { copyBlocksAgainst } from './blocks/read'
import type { Db } from './db/client'
import { deleteFeedbackOf } from './feedback/read'
import { anonymousSessions, goals, users } from './db/schema'
import type { FirebaseAdmin } from './firebase-admin'
import type { IdStore } from './id-store'
import { deactivateListingsOf, deleteListingsOf, listingPhotoKeysOf } from './listings/read'
import { deleteProfileOf, profilePhotoKeysOf, unpublishCardOf } from './profiles/read'
import { hasOpenReportAbout } from './reports/read'
import { endOpenRequests } from './requests/read'
import { deleteSavesOf } from './saved/read'
import type { Storage } from './storage'
import { lockAccountForDeletion } from './users'
import { deleteChecksOf } from './verification/read'

/** A tombstone keeps a hash of the identity (the Google account id), never the id itself. It
 *  stays the same when T-53 deletes the Firebase user, so a returning person meets the checks. */
export const tombstoneKey = (identity: string) => `deleted:${createHash('sha256').update(identity).digest('hex')}`

/**
 * Removes the data of an account (PD19) and ends every session (ADR-0007).
 *
 * The `users` row stays as a tombstone: `status = 'deleted'`, a new
 * `tokens_valid_after`, and the hash of the identity. Thus an old token gets a 401,
 * and the other person in a thread can still show "Deleted user". Reports and
 * blocks keep their ids for moderation.
 *
 * Order: hide, then lock the users row, then the photos, then the rows, then the Firebase user. A profile
 * photo change locks the same row (T-16a), so no photo is added after the read. The R2
 * and Firebase deletes are idempotent, so if a step fails, a retry is safe. If the
 * photos went last, a failure would leave photos that no row points to.
 *
 * Each module deletes its own rows. The account module owns `goals` and `anonymous_sessions` until the assistant has a module.
 *
 * The events stay, but the analytics id goes, so no event points to the person (T-24).
 *
 * Not here yet: Form B (T-35). The messages stay for the other person (T-44).
 */
export async function deleteAccount(
  { db, storage, idStore, firebaseAdmin }: { db: Db; storage: Pick<Storage, 'deleteObjects'>; idStore?: IdStore; firebaseAdmin: Pick<FirebaseAdmin, 'deleteUser'> | null },
  userId: string,
  identity: string,
) {
  await unpublishCardOf(db, userId)
  await deactivateListingsOf(db, userId)

  await db.transaction(async (tx) => {
    const user = await lockAccountForDeletion(tx, userId)
    // A second request at the same time (a double tap) waited on the lock. Without this stop, it would
    // hash the tombstone key again and clear rejoin_blocked, so a suspended person could sign in again.
    if (user!.status === 'deleted') return
    const [profilePhotos, listingPhotos] = await Promise.all([profilePhotoKeysOf(tx, userId), listingPhotoKeysOf(tx, userId)])
    await storage.deleteObjects([...new Set([...profilePhotos, ...listingPhotos])])
    await deleteChecksOf(tx, idStore, userId)
    await endOpenRequests(tx, userId)
    await deleteListingsOf(tx, userId)
    // The cascades remove the chat turns and the goals of a claimed visitor session.
    await tx.delete(goals).where(eq(goals.userId, userId))
    await tx.delete(anonymousSessions).where(eq(anonymousSessions.claimedByUserId, userId))
    await deleteProfileOf(tx, userId)
    await deleteSavesOf(tx, userId)
    await deletePushTokensOf(tx, userId)
    await deleteFeedbackOf(tx, userId)
    await tx.update(users).set({
      status: 'deleted',
      authProviderId: tombstoneKey(identity),
      // Whole seconds, like auth_time: a sign-in in the same second as the deletion counts as after it.
      tokensValidAfter: new Date(Math.floor(Date.now() / 1000) * 1000),
      rejoinBlocked: user!.status === 'suspended',
      email: null,
      analyticsId: null,
      lastSignInAt: null,
      updatedAt: new Date(),
    }).where(eq(users.id, userId))
    // Last: a sign-in after it gets a new uid, so it cannot find this account to retry a failed step.
    await firebaseAdmin?.deleteUser(user!.uid)
  })
}

/**
 * A fresh sign-in with the identity of a tombstone. A tombstone of a suspended account,
 * or one with an open report, cannot rejoin. Otherwise the person gets a new, empty
 * account, and each block against the old account moves to it. The tombstone lets go
 * of the hash, so the old `users.id` never comes back to life.
 */
export async function rejoin(db: Db, tombstoneId: string, uid: string, identity: string, signedInAt: Date) {
  return db.transaction(async (tx) => {
    const [tombstone] = await tx.select({ key: users.authProviderId, rejoinBlocked: users.rejoinBlocked })
      .from(users).where(eq(users.id, tombstoneId)).for('update')
    // A second request at the same time waited on the lock: the first one already rejoined.
    if (tombstone?.key !== tombstoneKey(identity)) return 'rejoined' as const
    if (tombstone.rejoinBlocked || await hasOpenReportAbout(tx, tombstoneId)) return 'blocked' as const

    await tx.update(users).set({ authProviderId: `deleted:${tombstoneId}`, updatedAt: new Date() }).where(eq(users.id, tombstoneId))
    const [user] = await tx.insert(users).values({ authProviderId: uid, tokensValidAfter: signedInAt }).returning({ id: users.id })
    await copyBlocksAgainst(tx, tombstoneId, user!.id)
    return 'rejoined' as const
  })
}
