import type { AdminHomeCard } from '@roomsie/contract'
import type { Db } from '../db/client'
import { feedbackOfWeek } from '../feedback/read'
import { currentGate, inviteCount } from '../invites/gate'
import { reportCounts } from '../reports/read'
import { latestDetails, quoteCount } from '../site/read'
import type { FastifyBaseLogger } from 'fastify'
import { aiCard, type CardSources } from '../models/overview'
import { hoursBefore, weekBefore } from '../time'
import { idCheckCounts } from '../verification/read'
import type { Moderation } from './settings'

async function moderationCard(db: Db, settings: Moderation, now: Date): Promise<AdminHomeCard> {
  const [reports, feedback] = await Promise.all([
    reportCounts(db, {
      safetyReasons: settings.safetyReasons, safetyLateBefore: hoursBefore(now, settings.lateHours.safetyReport), lateBefore: hoursBefore(now, settings.lateHours.report),
    }),
    feedbackOfWeek(db, now),
  ])
  return {
    subject: 'moderation', openReports: reports.open, lateSafety: reports.lateSafety, lateOther: reports.lateOther,
    oldestReportAt: reports.oldest?.toISOString() ?? null, feedbackThisWeek: feedback.total,
  }
}

async function idChecksCard(db: Db, settings: Moderation, now: Date): Promise<AdminHomeCard> {
  const checks = await idCheckCounts(db, { lateBefore: hoursBefore(now, settings.lateHours.idCheck), since: weekBefore(now) })
  return { subject: 'id_checks', waiting: checks.waiting, oldestCheckAt: checks.oldestCheckAt?.toISOString() ?? null, late: checks.late, verifiedThisWeek: checks.verified }
}

async function siteContentCard(db: Db): Promise<AdminHomeCard> {
  const [invites, gate, quotes, details] = await Promise.all([inviteCount(db), currentGate(db), quoteCount(db), latestDetails(db)])
  return { subject: 'site_content', invites, inviteOnly: gate.closed, quotes, detailsSet: Object.values(details).filter((v) => v !== null).length }
}

/** The scorecards of the subjects that the person can open (T-62), in the order of the designs. */
export async function homeCards(sources: CardSources & { moderation: Moderation }, { moderator, reviewer }: { moderator: boolean; reviewer: boolean }, log: FastifyBaseLogger) {
  const { db, moderation } = sources
  const now = new Date()
  return Promise.all([
    ...(moderator ? [moderationCard(db, moderation, now)] : []),
    ...(reviewer ? [idChecksCard(db, moderation, now)] : []),
    ...(moderator ? [aiCard(sources, log), siteContentCard(db)] : []),
  ])
}
