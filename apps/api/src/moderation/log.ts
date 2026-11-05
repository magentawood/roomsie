import { desc, eq, sql } from 'drizzle-orm'
import type { Db, Tx } from '../db/client'
import { moderationLog } from '../db/schema'
import { emailsOf } from '../users'

/** A person, or a listing with its owner. A row of a listing stays on its owner after a delete of the listing. */
type Target = { userId: string; listingId?: string }

export const logAction = (tx: Tx, moderatorUserId: string, action: (typeof moderationLog.$inferInsert)['action'], { userId, listingId }: Target) =>
  // clock_timestamp(): two rows of one transaction get two times, in their order.
  tx.insert(moderationLog).values({ action, moderatorUserId, subjectUserId: userId, listingId, createdAt: sql`clock_timestamp()` })

/** The newest rows of a person, with the rows of the person's listings, or of one listing. With the email of each moderator. */
export async function logOf(db: Db, of: { userId: string } | { listingId: string }, limit = 100) {
  const rows = await db.select({ id: moderationLog.id, action: moderationLog.action, listingId: moderationLog.listingId, moderator: moderationLog.moderatorUserId, at: moderationLog.createdAt })
    .from(moderationLog).where('userId' in of ? eq(moderationLog.subjectUserId, of.userId) : eq(moderationLog.listingId, of.listingId))
    .orderBy(desc(moderationLog.createdAt)).limit(limit)
  const emails = await emailsOf(db, rows.flatMap((r) => (r.moderator ? [r.moderator] : [])))
  return rows.map((r) => ({ id: r.id, action: r.action, listingId: r.listingId, by: (r.moderator && emails.get(r.moderator)) ?? null, at: r.at.toISOString() }))
}
