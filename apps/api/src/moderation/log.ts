import { desc, eq, sql } from 'drizzle-orm'
import type { Db, Tx } from '../db/client'
import { moderationLog } from '../db/schema'
import type { Subject } from '../reports/read'
import { emailsOf } from '../users'

export const logAction = (tx: Tx, moderatorUserId: string, action: (typeof moderationLog.$inferInsert)['action'], subject: Subject) =>
  // clock_timestamp(): two rows of one transaction get two times, in their order.
  tx.insert(moderationLog).values({ action, moderatorUserId, createdAt: sql`clock_timestamp()`, ...('userId' in subject ? { subjectUserId: subject.userId } : { listingId: subject.listingId }) })

/** The newest rows of a person or a listing, with the email of each moderator. */
export async function logOf(db: Db, subject: Subject, limit = 100) {
  const rows = await db.select({ id: moderationLog.id, action: moderationLog.action, moderator: moderationLog.moderatorUserId, at: moderationLog.createdAt }).from(moderationLog)
    .where('userId' in subject ? eq(moderationLog.subjectUserId, subject.userId) : eq(moderationLog.listingId, subject.listingId))
    .orderBy(desc(moderationLog.createdAt)).limit(limit)
  const emails = await emailsOf(db, rows.flatMap((r) => (r.moderator ? [r.moderator] : [])))
  return rows.map((r) => ({ id: r.id, action: r.action, by: (r.moderator && emails.get(r.moderator)) ?? null, at: r.at.toISOString() }))
}
