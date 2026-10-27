import { and, desc, eq, gt, inArray, isNotNull, or } from 'drizzle-orm'
import { checkExpiryDays, type VerificationResponse } from '@roomsie/contract'
import type { Db, Tx } from '../db/client'
import { profiles, verifications } from '../db/schema'
import type { IdStore } from '../id-store'

const expiryMs = checkExpiryDays * 86_400_000
/** A check in review that has not expired. */
export const openCheck = () => and(eq(verifications.state, 'in_review'), gt(verifications.createdAt, new Date(Date.now() - expiryMs)))

/** The users with an approved check: the badge on the cards and the listings (T-46). */
export async function verifiedAmong(db: Db, userIds: string[]) {
  if (!userIds.length) return new Set<string>()
  const rows = await db.selectDistinct({ userId: verifications.userId }).from(verifications)
    .where(and(inArray(verifications.userId, userIds), eq(verifications.state, 'verified')))
  return new Set(rows.map((r) => r.userId))
}

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
export async function deleteChecksOf(tx: Tx, idStore: IdStore | null, userId: string) {
  const files = await tx.select({ idPhotoKey: verifications.idPhotoKey, selfieKey: verifications.selfieKey }).from(verifications)
    .where(and(eq(verifications.userId, userId), or(isNotNull(verifications.idPhotoKey), isNotNull(verifications.selfieKey))))
  const keys = files.flatMap((f) => [f.idPhotoKey, f.selfieKey]).filter((k) => k !== null)
  // With no ID store, nothing was uploaded, and the lifecycle rule of the bucket removes a stale file.
  if (idStore && keys.length) await idStore.deleteObjects(keys)
  await tx.delete(verifications).where(eq(verifications.userId, userId))
}

/** The profiles whose person has an approved check. The card of a son or daughter shows no badge of the parent. */
export async function verifiedCards(db: Db, profileIds: string[]) {
  if (!profileIds.length) return new Set<string>()
  const rows = await db.selectDistinct({ id: profiles.id }).from(profiles)
    .innerJoin(verifications, and(eq(verifications.userId, profiles.userId), eq(verifications.state, 'verified')))
    .where(and(inArray(profiles.id, profileIds), eq(profiles.managedByParent, false)))
  return new Set(rows.map((r) => r.id))
}
