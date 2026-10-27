import { and, desc, eq, gt, inArray, isNotNull, lte, or } from 'drizzle-orm'
import { checkExpiryDays, type VerificationResponse } from '@roomsie/contract'
import type { Db, Tx } from '../db/client'
import { verifications } from '../db/schema'
import type { IdStore } from '../id-store'

const expiryMs = checkExpiryDays * 86_400_000
/** A check in review that has not expired. */
export const openCheck = () => and(eq(verifications.state, 'in_review'), gt(verifications.createdAt, new Date(Date.now() - expiryMs)))

/** The keys of the files of a check that still has them. */
export const fileKeys = (check: { idPhotoKey: string | null; selfieKey: string | null }) =>
  [check.idPhotoKey, check.selfieKey].filter((key) => key !== null)

/** An expired check keeps no keys and no score: the rule of the bucket deleted its files (PD8). */
export const clearExpired = (db: Db) => db.update(verifications).set({ idPhotoKey: null, selfieKey: null, faceMatch: null })
  .where(and(eq(verifications.state, 'in_review'), lte(verifications.createdAt, new Date(Date.now() - expiryMs)), isNotNull(verifications.idPhotoKey)))

/** A check in review or an approval stops a new check. */
export const blockingCheck = (db: Db | Tx, userId: string) => db.select({ id: verifications.id }).from(verifications)
  .where(and(eq(verifications.userId, userId), or(eq(verifications.state, 'verified'), openCheck()))).limit(1)

/** The latest check of the person. A check in review older than 7 days reads as expired. */
export async function verificationOf(db: Db, userId: string): Promise<VerificationResponse> {
  const [last] = await db.select().from(verifications).where(eq(verifications.userId, userId)).orderBy(desc(verifications.createdAt)).limit(1)
  if (!last) return { state: 'none', reason: null, note: null, sentAt: null, reviewedAt: null }
  const expired = last.state === 'in_review' && last.createdAt.getTime() <= Date.now() - expiryMs
  return {
    state: expired ? 'expired' : last.state, reason: last.reason, note: last.note,
    sentAt: last.createdAt.toISOString(), reviewedAt: last.reviewedAt?.toISOString() ?? null,
  }
}

/** At an account deletion: the files first, then the checks, whose cascade removes the audit rows (PD19). */
export async function deleteChecksOf(tx: Tx, idStore: IdStore | undefined, userId: string) {
  const files = await tx.select({ idPhotoKey: verifications.idPhotoKey, selfieKey: verifications.selfieKey }).from(verifications)
    .where(eq(verifications.userId, userId))
  const keys = files.flatMap(fileKeys)
  // With no ID store, nothing was uploaded, and the lifecycle rule of the bucket removes a stale file.
  if (idStore) await idStore.deleteObjects(keys)
  await tx.delete(verifications).where(eq(verifications.userId, userId))
}

/** The users with an approved check: the badge on the cards and the listings (T-46). */
export async function verifiedAmong(db: Db, userIds: string[]) {
  const rows = await db.selectDistinct({ userId: verifications.userId }).from(verifications)
    .where(and(inArray(verifications.userId, userIds), eq(verifications.state, 'verified')))
  return new Set(rows.map((r) => r.userId))
}
