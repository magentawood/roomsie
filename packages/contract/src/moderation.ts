import { z } from 'zod'
import { listingResponse } from './listings'
import { cardResponse } from './profiles'
import { reportReasons } from './reports'

/** Dismiss brings the card or the listing back, hide keeps it hidden, and suspend also suspends the account (T-19). */
export const reviewBody = z.strictObject({ action: z.enum(['dismiss', 'hide', 'suspend']) })
export type ReviewAction = z.infer<typeof reviewBody>['action']

/** `safety`: the reason is a safety reason of the settings (PD18). */
const queuedReport = z.object({ id: z.uuid(), reason: z.enum(reportReasons), safety: z.boolean(), detail: z.string().nullable(), createdAt: z.iso.datetime() })
/** The open reports of one person or one listing. The card is null after the person deleted it. */
export const reportQueueItem = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('person'), userId: z.uuid(), card: cardResponse.nullable(), hiddenForReview: z.boolean(), reports: z.array(queuedReport) }),
  z.object({ kind: z.literal('listing'), listing: listingResponse, reports: z.array(queuedReport) }),
])
export type ReportQueueItem = z.infer<typeof reportQueueItem>
export const reportQueueResponse = z.object({ items: z.array(reportQueueItem) })

export const adminRoles = ['moderator', 'reviewer'] as const
export type AdminRole = (typeof adminRoles)[number]

const count = z.int().min(0)
/**
 * The scorecards of the admin home: only the subjects that the person can open (T-62). A late item is past the time of PD18 or PD8.
 * "This week" is the last 7 days.
 */
export const adminHomeCard = z.discriminatedUnion('subject', [
  z.object({ subject: z.literal('moderation'), openReports: count, lateSafety: count, lateOther: count, oldestReportAt: z.iso.datetime().nullable(), feedbackThisWeek: count }),
  z.object({ subject: z.literal('id_checks'), waiting: count, oldestCheckAt: z.iso.datetime().nullable(), late: count, verifiedThisWeek: count }),
  z.object({ subject: z.literal('site_content'), invites: count, inviteOnly: z.boolean(), quotes: count, detailsSet: count }),
])
export type AdminHomeCard = z.infer<typeof adminHomeCard>
export const adminHomeResponse = z.object({ cards: z.array(adminHomeCard) })
/** What the web reads: it drops a card of a subject that it does not know, so a tab with an older bundle shows the other cards. */
export const adminHomeView = z.object({
  cards: z.array(z.unknown()).transform((cards) => cards.flatMap((card) => {
    const known = adminHomeCard.safeParse(card)
    return known.success ? [known.data] : []
  })),
})
