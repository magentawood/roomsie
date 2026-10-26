import type { ReportQueueItem, ReportReason } from '@roomsie/contract'

/** The seven reasons of PD18. */
export const reasonLabels = (kind: ReportQueueItem['kind']): Record<ReportReason, string> => ({
  fake: kind === 'person' ? 'Fake profile' : 'Fake listing', broker_or_spam: 'Broker or spam', harassment: 'Harassment',
  discriminatory_text: 'Discriminatory text', under_18: 'Under 18', contact_details: 'Shared contact details', other: 'Other',
})
export const reviewTimes = 'We review harassment and under-18 reports within 4 hours, and other reports within 24 hours.'

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
