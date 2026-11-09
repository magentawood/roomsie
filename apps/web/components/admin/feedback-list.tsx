'use client'

import { MessageChatSquare } from '@untitledui/icons'
import { feedbackRatings, type FeedbackRating } from '@roomsie/contract'
import { errorText } from '../../lib/api'
import { dateAndTime } from '../../lib/ist'
import { useAdminFeedback } from '../../lib/queries'
import { faces } from '../../lib/feedback'
import { Bar } from '../ui/bar'
import { EmptyState } from '../ui/empty-state'
import { Loading } from '../ui/loading'

function FacesThisWeek({ counts }: { counts: Record<FeedbackRating, number> }) {
  const total = feedbackRatings.reduce((sum, r) => sum + counts[r], 0)
  return (
    <aside aria-label="Faces this week" className="flex flex-col gap-3.5 rounded-xl border border-secondary p-5 lg:w-95 lg:shrink-0">
      <h2 className="text-md font-semibold text-primary">Faces this week</h2>
      {feedbackRatings.map((rating) => {
        const face = faces[rating]
        return (
          <p key={rating} className="flex items-center gap-2.5 text-sm text-tertiary">
            <face.icon size={20} aria-hidden className="shrink-0 text-fg-quaternary" />
            <span className="w-24 shrink-0 text-secondary">{face.label}</span>
            <Bar value={counts[rating]} max={total} label={face.label} className="h-2 flex-1" />
            <span className="w-6 text-right font-medium">{counts[rating]}</span>
          </p>
        )
      })}
      <p className="text-sm text-tertiary">{total === 1 ? '1 face' : `${total} faces`} in the last 7 days</p>
    </aside>
  )
}

/** The newest feedback: from the landing page (T-23a), and with a face after a goal closed (T-50). It names no sender. */
export function FeedbackList() {
  const feedback = useAdminFeedback()
  if (feedback.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(feedback.error)}</p>
  if (feedback.isPending) return <Loading mascot="working" />
  if (feedback.data.feedback.length === 0) return <EmptyState icon={MessageChatSquare} title="No feedback yet.">Feedback from the landing page and from closed goals shows here.</EmptyState>
  return (
    <div className="flex flex-col-reverse gap-5 lg:flex-row lg:items-start">
      <ul className="flex max-w-180 flex-1 flex-col gap-3">
        {feedback.data.feedback.map((item) => {
          const face = item.rating && faces[item.rating]
          return (
            <li key={item.id} className="flex flex-col gap-2 rounded-xl border border-secondary p-4">
              {face && <p className="flex items-center gap-2 text-sm font-medium text-secondary"><face.icon size={20} aria-hidden className="text-fg-quaternary" />{face.label}</p>}
              {item.text && <p className="text-md whitespace-pre-wrap text-primary">{item.text}</p>}
              <p className="text-sm text-tertiary">{dateAndTime(item.createdAt)}</p>
            </li>
          )
        })}
      </ul>
      <FacesThisWeek counts={feedback.data.facesThisWeek} />
    </div>
  )
}
