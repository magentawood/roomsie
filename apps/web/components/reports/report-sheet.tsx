'use client'

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Flag01 } from '@untitledui/icons'
import { uuidv7 } from 'uuidv7'
import { needsDetail, noContent, reportDetailLimit, type ReportBody, type ReportReason } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { firstName } from '../../lib/profile-form'
import { queryKeys } from '../../lib/queries'
import { reasonLabels, reviewTimes } from '../../lib/reports'
import { Button } from '../ui/button'
import { ChoiceChips } from '../ui/choice'
import { TextArea } from '../ui/field'
import { Modal } from '../ui/modal'

type Target = { listingId: string } | { profileId: string; name: string }

/** The report of a listing or of a person (PD18). */
export function ReportSheet({ target, onClose }: { target: Target; onClose: () => void }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  // ADR-0015: the id comes from the first tap, so a retry files no second report.
  const id = useRef<string | null>(null)
  const send = useMutation({ mutationFn: (body: ReportBody) => api(user, '/v1/reports', noContent, { method: 'POST', body }) })

  if (send.isSuccess) {
    // A report can hide the listing or the card, so the detail and Saved load again after the thanks.
    const done = () => {
      const [detail, saved] = 'listingId' in target ? [queryKeys.listing(target.listingId), queryKeys.saved('places')] : [queryKeys.person(target.profileId), queryKeys.saved('people')]
      void queryClient.invalidateQueries({ queryKey: detail })
      void queryClient.invalidateQueries({ queryKey: saved })
      onClose()
    }
    return (
      <Modal icon={Flag01} title="Thanks for the report" onClose={done} actions={<Button variant="secondary" size="lg" className="flex-1" onClick={done}>Done</Button>}>
        {reviewTimes}
      </Modal>
    )
  }
  const ready = reason !== null && (!needsDetail(reason) || detail !== null)
  const [title, intro, ids, kind] = 'listingId' in target
    ? ['Report this listing', 'Pick one reason. The lister is not told who reported.', { listingId: target.listingId }, 'listing' as const]
    : ['What’s the issue?', `Pick one reason. ${firstName(target.name)} is not told who reported.`, { profileId: target.profileId }, 'person' as const]
  return (
    <Modal icon={Flag01} title={title} onClose={onClose}
      actions={(
        <>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" size="lg" className="flex-1" disabled={!ready || send.isPending}
            onClick={() => send.mutate({ id: (id.current ??= uuidv7()), ...ids, reason: reason!, detail })}>
            Submit report
          </Button>
        </>
      )}>
      <div className="flex flex-col gap-4">
        <p>{intro}</p>
        <ChoiceChips label="Reason" labels={reasonLabels(kind)} value={reason} onChange={setReason} required />
        <TextArea label="Tell us more" value={detail} onChange={setDetail} maxLength={reportDetailLimit}
          hint={reason && needsDetail(reason) ? 'Required for Other.' : 'Optional.'} />
        <p>{reviewTimes}</p>
        {send.isError && <p role="alert" className="text-error-primary">{errorText(send.error)}</p>}
      </div>
    </Modal>
  )
}
