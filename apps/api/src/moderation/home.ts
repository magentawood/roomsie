import type { AdminHomeCard } from '@roomsie/contract'
import type { Db } from '../db/client'
import { feedbackSince } from '../feedback/read'
import { currentGate, inviteCount } from '../invites/gate'
import { openReports } from '../reports/read'
import { latestDetails, quoteCount } from '../site/read'
import { checkNumbers } from '../verification/read'
import type { Moderation } from './settings'

const hour = 3_600_000

/** One item for each reported listing, or person: the report queue has the same items. Reports come oldest first. */
async function moderationCard(db: Db, settings: Moderation, now: number, weekAgo: Date): Promise<AdminHomeCard> {
  const [reports, feedback] = await Promise.all([openReports(db), feedbackSince(db, weekAgo)])
  const items = new Map<string, typeof reports>()
  for (const r of reports) items.set(r.listingId ?? r.subjectUserId, [...(items.get(r.listingId ?? r.subjectUserId) ?? []), r])
  const late = (r: (typeof reports)[number], hours: number) => r.createdAt.getTime() < now - hours * hour
  let lateSafety = 0, lateOther = 0
  for (const list of items.values()) {
    if (list.some((r) => settings.safetyReasons.includes(r.reason) && late(r, settings.lateHours.safetyReport))) lateSafety++
    else if (list.some((r) => late(r, settings.lateHours.report))) lateOther++
  }
  return {
    subject: 'moderation', openReports: items.size, lateSafety, lateOther,
    oldestReportAt: reports[0]?.createdAt.toISOString() ?? null, feedbackThisWeek: feedback.total,
  }
}

async function idChecksCard(db: Db, settings: Moderation, now: number, weekAgo: Date): Promise<AdminHomeCard> {
  const n = await checkNumbers(db, { lateBefore: new Date(now - settings.lateHours.idCheck * hour), since: weekAgo })
  return { subject: 'id_checks', waiting: n.waiting, oldestAt: n.oldestAt?.toISOString() ?? null, late: n.late, verifiedThisWeek: n.verified }
}

async function siteContentCard(db: Db): Promise<AdminHomeCard> {
  const [invites, gate, quotes, details] = await Promise.all([inviteCount(db), currentGate(db), quoteCount(db), latestDetails(db)])
  return { subject: 'site_content', invites, inviteOnly: gate.closed, quotes, detailsSet: Object.values(details).filter((v) => v !== null).length }
}

/** The scorecards of the subjects that the person can open (T-62), in the order of the designs. */
export async function homeCards(db: Db, settings: Moderation, { moderator, reviewer }: { moderator: boolean; reviewer: boolean }) {
  const now = Date.now()
  const weekAgo = new Date(now - 7 * 24 * hour)
  return Promise.all([
    ...(moderator ? [moderationCard(db, settings, now, weekAgo)] : []),
    ...(reviewer ? [idChecksCard(db, settings, now, weekAgo)] : []),
    ...(moderator ? [siteContentCard(db)] : []),
  ])
}
