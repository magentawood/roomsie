'use client'

import { MessageChatSquare } from '@untitledui/icons'
import type { FeedbackRating } from '@roomsie/contract'
import { errorText } from '../../lib/api'
import { india } from '../../lib/ist'
import { useAdminFeedback } from '../../lib/queries'
import { faces } from '../chat/found-dialogs'
import { EmptyState } from '../ui/empty-state'

const sentAt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', ...india })

function Face({ rating }: { rating: FeedbackRating }) {
  const { label, icon: FaceIcon } = faces[rating]
  return <p className="flex items-center gap-2 text-sm font-medium text-secondary"><FaceIcon size={20} aria-hidden className="text-fg-quaternary" />{label}</p>
}

/** The newest feedback: from the landing page (T-23a), and with a face after a goal closed (T-50). It names no sender. */
export function FeedbackList() {
  const feedback = useAdminFeedback()
  if (feedback.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(feedback.error)}</p>
  if (feedback.isPending) return <p className="text-sm text-tertiary">Loading…</p>
  if (feedback.data.feedback.length === 0) return <EmptyState icon={MessageChatSquare} title="No feedback yet.">Feedback from the landing page and from closed goals shows here.</EmptyState>
  return (
    <ul className="flex flex-col gap-3">
      {feedback.data.feedback.map((item) => (
        <li key={item.id} className="flex flex-col gap-2 rounded-xl border border-secondary p-4">
          {item.rating && <Face rating={item.rating} />}
          {item.text && <p className="text-md whitespace-pre-wrap text-primary">{item.text}</p>}
          <p className="text-sm text-tertiary">{sentAt.format(new Date(item.createdAt))}</p>
        </li>
      ))}
    </ul>
  )
}
