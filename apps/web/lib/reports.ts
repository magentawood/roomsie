import type { Conversation, OutgoingRequest, ReportQueueItem, ReportReason } from '@roomsie/contract'
import { listingChat } from './messages'

export const reasonLabels = (kind: ReportQueueItem['kind']): Record<ReportReason, string> => ({
  fake: kind === 'person' ? 'Fake profile' : 'Fake listing', broker_or_spam: 'Broker or spam', harassment: 'Harassment',
  discriminatory_text: 'Discriminatory text', under_18: 'Under 18', contact_details: 'Shared contact details', other: 'Other',
})
export const reviewTimes = 'We review harassment and under-18 reports within 4 hours, and other reports within 24 hours.'

/** A choice of the report modal: a reason, or "Not interested", which files no report (PD17). */
export type ReportChoice = ReportReason | 'not_interested'
export const notInterestedLabels = { not_interested: 'Not interested' } as const
/** A listing offers "Not interested" only when a chat or an open request joins the user and its lister. */
export const joinsLister = (outgoing: readonly OutgoingRequest[], conversations: readonly Conversation[], listingId: string) =>
  ['sent', 'accepted'].includes(listingChat(outgoing, conversations, listingId).state)
/** What "Not interested" does, in the modal. `name`: the first name, or "the lister". */
export const notInterestedText = (name: string) =>
  `This removes your chat with ${name} from Messages, for both of you. Neither of you can send the other a new request. We don’t file a report.`

export function ago(iso: string, now = new Date()) {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`
  const days = Math.floor(minutes / (24 * 60))
  return days === 1 ? '1 day ago' : `${days} days ago`
}

/** "2 reports · first 3 h ago". The reports come oldest first. */
export function summary({ reports }: ReportQueueItem, now = new Date()) {
  const first = ago(reports[0]!.createdAt, now)
  return reports.length === 1 ? `1 report · ${first}` : `${reports.length} reports · first ${first}`
}
