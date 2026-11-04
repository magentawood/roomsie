import { and, asc, count, eq, inArray, isNull, lt, min, not, sql } from 'drizzle-orm'
import type { ReportReason } from '@roomsie/contract'
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

/** The open reports, the safety reports and the other reports past their review time (PD18), and the oldest (T-62). */
export async function reportCounts(db: Db, { safetyReasons, safetyLateBefore, lateBefore }: { safetyReasons: ReportReason[]; safetyLateBefore: Date; lateBefore: Date }) {
  const safety = inArray(reports.reason, safetyReasons)
  const [row] = await db.select({
    open: count(),
    lateSafety: sql<number>`count(*) filter (where ${and(safety, lt(reports.createdAt, safetyLateBefore))})`.mapWith(Number),
    lateOther: sql<number>`count(*) filter (where ${and(not(safety), lt(reports.createdAt, lateBefore))})`.mapWith(Number),
    oldest: min(reports.createdAt),
  }).from(reports).where(eq(reports.status, 'open'))
  return row!
}
