'use client'

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Flag01 } from '@untitledui/icons'
import { uuidv7 } from 'uuidv7'
import { needsDetail, noContent, reportDetailLimit, type ReportBody, type ReportReason } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { queryKeys } from '../../lib/queries'
import { reasonLabels, reviewTimes } from '../../lib/reports'
import { Button } from '../ui/button'
import { ChoiceChips } from '../ui/choice'
import { TextArea } from '../ui/field'
import { Modal } from '../ui/modal'


/** The report of a listing (PD18). */
export function ReportSheet({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  // ADR-0015: the id comes from the first tap, so a retry files no second report.
  const id = useRef<string | null>(null)
  const send = useMutation({ mutationFn: (body: ReportBody) => api(user, '/v1/reports', noContent, { method: 'POST', body }) })

  if (send.isSuccess) {
    // A report can hide the listing, so the detail and Saved load again after the thanks.
    const done = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.listing(listingId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.saved('places') })
      onClose()
    }
    return (
      <Modal icon={Flag01} title="Thanks for the report" onClose={done} actions={<Button variant="secondary" size="lg" className="flex-1" onClick={done}>Done</Button>}>
        {reviewTimes}
      </Modal>
    )
  }
  const ready = reason !== null && (!needsDetail(reason) || detail !== null)
  return (
    <Modal icon={Flag01} title="Report this listing" onClose={onClose}
      actions={(
        <>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" size="lg" className="flex-1" disabled={!ready || send.isPending}
            onClick={() => send.mutate({ id: (id.current ??= uuidv7()), listingId, reason: reason!, detail })}>
            Submit report
          </Button>
        </>
      )}>
      <div className="flex flex-col gap-4">
        <p>Pick one reason. The lister is not told who reported.</p>
        <ChoiceChips label="Reason" labels={reasonLabels('listing')} value={reason} onChange={setReason} required />
        <TextArea label="Tell us more" value={detail} onChange={setDetail} maxLength={reportDetailLimit}
          hint={reason && needsDetail(reason) ? 'Required for Other.' : 'Optional.'} />
        <p>{reviewTimes}</p>
        {send.isError && <p role="alert" className="text-error-primary">{errorText(send.error)}</p>}
      </div>
    </Modal>
  )
}
