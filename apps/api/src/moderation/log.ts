import { desc, eq } from 'drizzle-orm'
import type { Db, Tx } from '../db/client'
import { moderationLog } from '../db/schema'
import { emailsOf } from '../users'

export type Subject = { userId: string } | { listingId: string }

/** Adds a row of the moderation log (T-63). The pages of people and listings and the report queue write it. */
export const logAction = (tx: Tx, moderatorUserId: string, action: (typeof moderationLog.$inferInsert)['action'], subject: Subject) =>
  tx.insert(moderationLog).values({ action, moderatorUserId, ...('userId' in subject ? { subjectUserId: subject.userId } : { listingId: subject.listingId }) })

/** The rows of a person or a listing, the newest first, with the email of each moderator. */
export async function logOf(db: Db, subject: Subject) {
  const rows = await db.select({ action: moderationLog.action, moderator: moderationLog.moderatorUserId, at: moderationLog.createdAt }).from(moderationLog)
    .where('userId' in subject ? eq(moderationLog.subjectUserId, subject.userId) : eq(moderationLog.listingId, subject.listingId)).orderBy(desc(moderationLog.createdAt))
  const emails = await emailsOf(db, rows.flatMap((r) => (r.moderator ? [r.moderator] : [])))
  return rows.map((r) => ({ action: r.action, by: (r.moderator && emails.get(r.moderator)) ?? null, at: r.at.toISOString() }))
}
