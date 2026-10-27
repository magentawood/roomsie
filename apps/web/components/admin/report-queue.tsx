'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Home02, SlashCircle01, User01 } from '@untitledui/icons'
import { listingTitle, noContent, type ReportQueueItem, type ReviewAction } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { rentAmount } from '../../lib/listing-steps'
import { firstName } from '../../lib/profile-form'
import { queryKeys, useReportQueue } from '../../lib/queries'
import { ago, reasonLabels, summary } from '../../lib/reports'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { EmptyState } from '../ui/empty-state'
import { Modal } from '../ui/modal'

/** `owner` is the person that Suspend suspends. */
function subjectOf(item: ReportQueueItem) {
  if (item.kind === 'listing') {
    const { listing } = item
    const rent = rentAmount(listing)
    return {
      name: listingTitle(listing), photo: listing.photos[0]?.url, hidden: listing.hidden, text: listing.description,
      line: [rent && `${rent} a month`, listing.lister && `Listed by ${listing.lister.name}`].filter(Boolean).join(' · '),
      owner: listing.lister?.name,
    }
  }
  const { card } = item
  return {
    name: card ? [card.fullName, card.age].filter(Boolean).join(', ') : 'Deleted profile', photo: card?.photos[0]?.url,
    hidden: item.hiddenForReview, text: card?.bio, line: card?.jobRole, owner: card?.fullName,
  }
}

function QueueItem({ item }: { item: ReportQueueItem }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const review = useMutation({
    mutationFn: (action: ReviewAction) => api(
      user, `/v1/admin/${item.kind === 'person' ? `users/${item.userId}` : `listings/${item.listing.id}`}/review`, noContent,
      { method: 'POST', body: { action } },
    ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.reportQueue }),
  })
  const subject = subjectOf(item)
  const labels = reasonLabels(item.kind)
  const safety = item.reports.find((r) => r.safety)
  const decide = (action: ReviewAction) => { setConfirming(false); review.mutate(action) }

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-secondary p-4 md:p-5">
      <div className="flex items-start gap-3">
        {subject.photo
          ? <img src={subject.photo} alt="" className={`size-16 shrink-0 object-cover ${item.kind === 'person' ? 'rounded-full' : 'rounded-md'}`} />
          : (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-tertiary text-fg-quaternary">
              {item.kind === 'person' ? <User01 size={20} aria-hidden /> : <Home02 size={20} aria-hidden />}
            </span>
          )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-primary">{subject.name}</span>
            {safety && <Badge tone="error" dot={false}>{labels[safety.reason]}</Badge>}
            <Badge tone="gray" dot={false}>{subject.hidden ? 'Hidden' : 'Visible'}</Badge>
          </p>
          {subject.line && <p className="text-sm text-tertiary">{subject.line}</p>}
          <p className="text-sm text-tertiary">{summary(item)}</p>
        </div>
      </div>
      <ul className="divide-y divide-secondary rounded-lg border border-secondary">
        {item.reports.map((r) => (
          <li key={r.id} className="px-4 py-3 text-sm">
            <p className="font-medium text-secondary">{labels[r.reason]} · {ago(r.createdAt)}</p>
            {r.detail && <p className="text-tertiary">{r.detail}</p>}
          </li>
        ))}
      </ul>
      {subject.text && <blockquote className="border-l-2 border-secondary pl-3 text-sm text-tertiary">{subject.text}</blockquote>}
      {review.isError && <p role="alert" className="text-sm text-error-primary">{errorText(review.error)}</p>}
      {/* On a phone, the three buttons fill the row. */}
      <div className="flex gap-3 *:flex-1 md:*:flex-none">
        <Button variant="secondary" size="sm" disabled={review.isPending} onClick={() => decide('dismiss')}>Dismiss</Button>
        <Button variant="secondary" size="sm" disabled={review.isPending} onClick={() => decide('hide')}>{subject.hidden ? 'Keep hidden' : 'Hide'}</Button>
        <Button variant="destructive" size="sm" disabled={review.isPending} onClick={() => setConfirming(true)}>Suspend</Button>
      </div>
      {confirming && (
        <Modal icon={SlashCircle01} title={`Suspend ${subject.owner ?? 'this person'}?`} onClose={() => setConfirming(false)}
          actions={(
            <>
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setConfirming(false)}>Cancel</Button>
              <Button variant="destructive" size="lg" className="flex-1" onClick={() => decide('suspend')}>Suspend</Button>
            </>
          )}>
          {subject.owner ? firstName(subject.owner) : 'The person'} is signed out everywhere. The card and the listings are hidden, and the open
          requests are withdrawn. Only a developer can undo this.
        </Modal>
      )}
    </li>
  )
}

/** The open reports, one item for each person or listing (T-19). The API sorts them: safety reports first, then the oldest. */
export function ReportQueue() {
  const queue = useReportQueue()
  if (queue.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(queue.error)}</p>
  if (queue.isPending) return <p className="text-sm text-tertiary">Loading…</p>
  if (!queue.data.items.length) {
    return (
      <EmptyState icon={CheckCircle} title="No open reports">
        New reports show here. Review safety reports within 4 hours, and other reports within 24 hours.
      </EmptyState>
    )
  }
  return (
    <ul className="flex flex-col gap-4">
      {queue.data.items.map((item) => <QueueItem key={item.kind === 'person' ? item.userId : item.listing.id} item={item} />)}
    </ul>
  )
}
