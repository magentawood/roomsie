import { and, asc, count, desc, eq, inArray, isNotNull, isNull, lt, min, not, sql } from 'drizzle-orm'
import type { ReportReason, ReportStatus } from '@roomsie/contract'
import type { Db, Tx } from '../db/client'
import { reports } from '../db/schema'

/** A person or a listing that reports are about. */
export type Subject = { userId: string } | { listingId: string }
/** The reports of a person, not of a listing, or of a listing. */
const about = (subject: Subject) => ('listingId' in subject ? eq(reports.listingId, subject.listingId) : and(eq(reports.subjectUserId, subject.userId), isNull(reports.listingId)))

/** The moderator's queue: the open reports, oldest first (T-19). */
export const openReports = (db: Db) => db.select().from(reports).where(eq(reports.status, 'open')).orderBy(asc(reports.createdAt))

/**
 * Closes the open reports of a queue item: a listing, or a person with no listing. Gives the reported user of each.
 * The reports of a listing that its owner deleted have no listing, so they go with the person.
 */
export function closeReports(tx: Tx, item: Subject, status: Exclude<ReportStatus, 'open'>) {
  return tx.update(reports).set({ status }).where(and(about(item), eq(reports.status, 'open'))).returning({ subjectUserId: reports.subjectUserId })
}

/** At a suspension: each open report about the person is actioned. */
export const actionReportsAbout = (tx: Tx, userId: string) =>
  tx.update(reports).set({ status: 'actioned' }).where(and(eq(reports.subjectUserId, userId), eq(reports.status, 'open')))

export async function hasOpenReportAbout(tx: Tx, userId: string) {
  const [open] = await tx.select({ id: reports.id }).from(reports).where(and(eq(reports.subjectUserId, userId), eq(reports.status, 'open'))).limit(1)
  return !!open
}

/** Late: past the review time of PD18 (T-62). */
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

/** The newest reports of a person or a listing. */
export const reportsAbout = (db: Db, subject: Subject, limit = 100) => db.select().from(reports).where(about(subject)).orderBy(desc(reports.createdAt)).limit(limit)

/** The count of the open reports of each person or listing. */
export async function openReportCounts(db: Db, by: 'userId' | 'listingId', ids: string[]) {
  const column = by === 'userId' ? reports.subjectUserId : reports.listingId
  const rows = await db.select({ id: column, open: count() }).from(reports)
    .where(and(inArray(column, ids), eq(reports.status, 'open'), by === 'userId' ? isNull(reports.listingId) : undefined)).groupBy(column)
  return new Map(rows.flatMap((r) => (r.id ? [[r.id, r.open] as const] : [])))
}

/** The people, or the listings, with an open report, the newest report first. */
export async function reportedIds(db: Db, by: 'userId' | 'listingId', limit: number) {
  const column = by === 'userId' ? reports.subjectUserId : reports.listingId
  const rows = await db.select({ id: column }).from(reports)
    .where(and(eq(reports.status, 'open'), by === 'userId' ? isNull(reports.listingId) : isNotNull(reports.listingId)))
    .groupBy(column).orderBy(desc(sql`max(${reports.createdAt})`)).limit(limit)
  return rows.flatMap((r) => (r.id ? [r.id] : []))
}
