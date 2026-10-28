'use client'

import { MessageChatSquare } from '@untitledui/icons'
import { errorText } from '../../lib/api'
import { useFeedback } from '../../lib/queries'
import { EmptyState } from '../ui/empty-state'

const sentAt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

/** The newest feedback from the landing page (T-23a). It names no sender. */
export function FeedbackList() {
  const feedback = useFeedback()
  if (feedback.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(feedback.error)}</p>
  if (feedback.isPending) return <p className="text-sm text-tertiary">Loading…</p>
  if (feedback.data.feedback.length === 0) return <EmptyState icon={MessageChatSquare} title="No feedback yet.">Feedback from the landing page shows here.</EmptyState>
  return (
    <ul className="flex flex-col gap-3">
      {feedback.data.feedback.map((item) => (
        <li key={item.id} className="flex flex-col gap-2 rounded-xl border border-secondary p-4">
          <p className="text-md whitespace-pre-wrap text-primary">{item.text}</p>
          <p className="text-sm text-tertiary">{sentAt.format(new Date(item.createdAt))}</p>
        </li>
      ))}
    </ul>
  )
}
