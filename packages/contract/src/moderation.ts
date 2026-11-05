import { z } from 'zod'
import { listingResponse } from './listings'
import { callShare } from './models'
import { cardResponse, visibilities } from './profiles'
import { reportReasons, reportStatuses } from './reports'
import { knownRows } from './shared'

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

export type AdminRole = 'moderator' | 'reviewer'

const count = z.int().min(0)
/** The scorecards of the admin home: only the subjects that the person can open (T-62). A late item is past the time of PD18 or PD8. */
export const adminHomeCard = z.discriminatedUnion('subject', [
  z.object({ subject: z.literal('moderation'), openReports: count, lateSafety: count, lateOther: count, oldestReportAt: z.iso.datetime().nullable(), feedbackThisWeek: count }),
  z.object({ subject: z.literal('id_checks'), waiting: count, oldestCheckAt: z.iso.datetime().nullable(), late: count, verifiedThisWeek: count }),
  z.object({ subject: z.literal('people_listings'), people: count, newToday: count, liveListings: count, hidden: count, suspended: count }),
  z.object({ subject: z.literal('ai_pipeline'), spendToday: z.number().min(0), dailyAmount: z.number().positive(), failedShare: callShare.nullable(), fallbackShare: callShare.nullable(), geminiOnly: z.boolean() }),
  z.object({ subject: z.literal('site_content'), invites: count, inviteOnly: z.boolean(), quotes: count, detailsSet: count }),
])
export type AdminHomeCard = z.infer<typeof adminHomeCard>
export const adminHomeResponse = z.object({ cards: z.array(adminHomeCard) })
/** Drops a card of an unknown subject, so a tab with an older bundle shows the other cards. */
export const adminHomeView = z.object({ cards: knownRows(adminHomeCard, 'subject', adminHomeCard.options.map((card) => card.shape.subject.value)) })

/** The actions of a moderator on a person and on a listing (T-63). Each goes in the moderation log. */
export const personActions = ['hide', 'unhide', 'suspend'] as const
export const listingActions = ['hide', 'unhide', 'remove'] as const
export const personActionBody = z.strictObject({ action: z.enum(personActions) })
export const listingActionBody = z.strictObject({ action: z.enum(listingActions) })
export const moderationActions = ['hide', 'unhide', 'suspend', 'remove'] as const
export const peopleFilters = ['reported', 'hidden', 'suspended', 'verified'] as const
export const listingFilters = ['reported', 'hidden', 'removed'] as const
// A list is a search or a filter, so each gives the 50 newest that match.
const oneOf = (query: { q?: string; filter?: string }) => !(query.q && query.filter)
export const adminSearchMax = 100
const search = z.string().trim().max(adminSearchMax).optional()
export const adminPeopleQuery = z.object({ q: search, filter: z.enum(peopleFilters).optional() }).refine(oneOf, 'a search or a filter, not both')
export const adminListingsQuery = z.object({ q: search, filter: z.enum(listingFilters).optional() }).refine(oneOf, 'a search or a filter, not both')
export type AdminPeopleQuery = z.input<typeof adminPeopleQuery>
export type AdminListingsQuery = z.input<typeof adminListingsQuery>
/** `listingId` is set for an action on a listing, also after its owner deleted it. */
const logEntry = z.object({ id: z.uuid(), action: z.enum(moderationActions), listingId: z.uuid().nullable(), by: z.string().nullable(), at: z.iso.datetime() })
const subjectReport = z.object({ id: z.uuid(), reason: z.enum(reportReasons), detail: z.string().nullable(), status: z.enum(reportStatuses), createdAt: z.iso.datetime() })

/** A person of the admin: never gender, religion or community (the spec of the admin panel). `name` is null with no card. */
export const adminPersonRow = z.object({
  userId: z.uuid(), name: z.string().nullable(), email: z.string().nullable(), photoUrl: z.string().nullable(),
  joinedAt: z.iso.datetime(), lastActiveAt: z.iso.datetime().nullable(), openReports: count, hidden: z.boolean(), suspended: z.boolean(), verified: z.boolean(),
})
export const adminPeopleResponse = z.object({ people: z.array(adminPersonRow) })
export const adminPersonResponse = adminPersonRow.extend({ card: cardResponse.nullable(), visibility: z.enum(visibilities).nullable(), reports: z.array(subjectReport), log: z.array(logEntry) })

export const adminListingRow = z.object({
  id: z.uuid(), title: z.string(), area: z.string().nullable(), lister: z.string().nullable(), listerEmail: z.string().nullable(), rent: z.int().nullable(),
  postedAt: z.iso.datetime(), openReports: count, live: z.boolean(), hidden: z.boolean(), removed: z.boolean(), expired: z.boolean(),
})
export const adminListingsResponse = z.object({ listings: z.array(adminListingRow) })
export const adminListingResponse = adminListingRow.extend({ listerUserId: z.uuid(), listing: listingResponse, reports: z.array(subjectReport), log: z.array(logEntry) })
const knownLists = { reports: knownRows(subjectReport, 'reason', reportReasons), log: knownRows(logEntry, 'action', moderationActions) }
export const adminPersonView = adminPersonResponse.extend(knownLists)
export const adminListingView = adminListingResponse.extend(knownLists)
export type AdminPersonRow = z.infer<typeof adminPersonRow>
export type AdminListingRow = z.infer<typeof adminListingRow>
export type AdminLogEntry = z.infer<typeof logEntry>
export type AdminSubjectReport = z.infer<typeof subjectReport>

