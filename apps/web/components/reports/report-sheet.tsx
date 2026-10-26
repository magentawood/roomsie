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

export type PersonTarget = { profileId: string; firstName: string }

/** The report of a listing or of a person (PD18). */
export function ReportSheet({ target, onClose }: { target: { listingId: string } | PersonTarget; onClose: () => void }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  // ADR-0015: the id comes from the first tap, so a retry files no second report.
  const id = useRef<string | null>(null)
  const send = useMutation({ mutationFn: (body: ReportBody) => api(user, '/v1/reports', noContent, { method: 'POST', body }) })

  const sheet = 'listingId' in target
    ? {
        title: 'Report this listing', intro: 'Pick one reason. The lister is not told who reported.', ids: { listingId: target.listingId },
        reasons: reasonLabels('listing'), keys: [queryKeys.listing(target.listingId), queryKeys.saved('places')],
      }
    : {
        title: 'What’s the issue?', intro: `Pick one reason. ${target.firstName} is not told who reported.`, ids: { profileId: target.profileId },
        reasons: reasonLabels('person'), keys: [queryKeys.person(target.profileId), queryKeys.saved('people')],
      }

  if (send.isSuccess) {
    // A report can hide the listing or the card, so the detail and Saved load again after the thanks.
    const done = () => {
      sheet.keys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }))
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
    <Modal icon={Flag01} title={sheet.title} onClose={onClose}
      actions={(
        <>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" size="lg" className="flex-1" disabled={!ready || send.isPending}
            onClick={() => send.mutate({ id: (id.current ??= uuidv7()), ...sheet.ids, reason: reason!, detail })}>
            Submit report
          </Button>
        </>
      )}>
      <div className="flex flex-col gap-4">
        <p>{sheet.intro}</p>
        <ChoiceChips label="Reason" labels={sheet.reasons} value={reason} onChange={setReason} required />
        <TextArea label="Tell us more" value={detail} onChange={setDetail} maxLength={reportDetailLimit}
          hint={reason && needsDetail(reason) ? 'Required for Other.' : 'Optional.'} />
        <p>{reviewTimes}</p>
        {send.isError && <p role="alert" className="text-error-primary">{errorText(send.error)}</p>}
      </div>
    </Modal>
  )
}
