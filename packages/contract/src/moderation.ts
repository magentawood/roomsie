import { z } from 'zod'
import { listingResponse } from './listings'
import { cardResponse } from './profiles'
import { reportReasons } from './reports'

/** Dismiss brings the card or the listing back, hide keeps it hidden, and suspend also suspends the account (T-19). */
export const reviewBody = z.strictObject({ action: z.enum(['dismiss', 'hide', 'suspend']) })
export type ReviewAction = z.infer<typeof reviewBody>['action']

const queuedReport = z.object({ id: z.uuid(), reason: z.enum(reportReasons), detail: z.string().nullable(), createdAt: z.iso.datetime() })
/** The open reports of one person or one listing. The card is null after the person deleted it. */
export const reportQueueItem = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('person'), userId: z.uuid(), card: cardResponse.nullable(), hidden: z.boolean(), reports: z.array(queuedReport) }),
  z.object({ kind: z.literal('listing'), listing: listingResponse, reports: z.array(queuedReport) }),
])
export type ReportQueueItem = z.infer<typeof reportQueueItem>
export const reportQueueResponse = z.object({ items: z.array(reportQueueItem) })
