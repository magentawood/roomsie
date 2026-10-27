import { and, asc, eq, isNull } from 'drizzle-orm'
import type { Db, Tx } from '../db/client'
import { reports } from '../db/schema'

/** The moderator's queue: the open reports, oldest first (T-19). */
export const openReports = (db: Db) => db.select().from(reports).where(eq(reports.status, 'open')).orderBy(asc(reports.createdAt))

/**
 * Closes the open reports of a queue item: a listing, or a person with no listing. Gives the reported user of each.
 * The reports of a listing that its owner deleted have no listing, so they go with the person.
 */
export function closeReports(tx: Tx, item: { listingId: string } | { userId: string }, status: 'dismissed' | 'actioned') {
  const ofItem = 'listingId' in item ? eq(reports.listingId, item.listingId) : and(eq(reports.subjectUserId, item.userId), isNull(reports.listingId))
  return tx.update(reports).set({ status }).where(and(ofItem, eq(reports.status, 'open'))).returning({ subjectUserId: reports.subjectUserId })
}

/** At a suspension: each open report about the person is actioned. */
export const actionReportsAbout = (tx: Tx, userId: string) =>
  tx.update(reports).set({ status: 'actioned' }).where(and(eq(reports.subjectUserId, userId), eq(reports.status, 'open')))

export async function hasOpenReportAbout(tx: Tx, userId: string) {
  const [open] = await tx.select({ id: reports.id }).from(reports).where(and(eq(reports.subjectUserId, userId), eq(reports.status, 'open'))).limit(1)
  return !!open
}
