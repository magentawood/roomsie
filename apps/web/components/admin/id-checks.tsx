'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, SlashCircle01, User01 } from '@untitledui/icons'
import {
  documentTypeLabels, idCheckPhotosResponse, noContent, rejectReasonLabels, reviewNoteLimit, type IdCheckQueueResponse, type RejectReason, type ReviewCheckBody,
} from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { queryKeys, useIdChecks } from '../../lib/queries'
import { ago } from '../../lib/reports'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ChoiceChips } from '../ui/choice'
import { EmptyState } from '../ui/empty-state'
import { TextArea } from '../ui/field'
import { ModalFrame, ModalHead } from '../ui/modal'

type Check = IdCheckQueueResponse['checks'][number]

const faceLine = (score: number | null) => (score === null ? 'Face match: no score' : `Face match ${Math.round(score)}% · from Amazon Rekognition, a help only`)

function RejectDialog({ name, busy, onReject, onClose }: { name: string; busy: boolean; onReject: (reason: RejectReason, note: string | null) => void; onClose: () => void }) {
  const [reason, setReason] = useState<RejectReason | null>(null)
  const [note, setNote] = useState<string | null>(null)
  return (
    <ModalFrame labelledBy="reject-title" onClose={onClose}>
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <ModalHead icon={SlashCircle01} titleId="reject-title" title={`Reject ${name}’s check?`} onClose={onClose}>
          {name} sees the reason and the note, and can send a new ID. We delete both photos now.
        </ModalHead>
        <ChoiceChips label="Reason" labels={rejectReasonLabels} value={reason} onChange={setReason} required />
        <TextArea label={`Note to ${name} (optional)`} value={note} onChange={setNote} maxLength={reviewNoteLimit}
          hint={`At most ${reviewNoteLimit} characters. Be kind: say what to fix.`} placeholder="The photo on the ID is cut off at the top." />
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" size="lg" className="flex-1" disabled={!reason || busy} onClick={() => onReject(reason!, note)}>Reject</Button>
        </div>
      </div>
    </ModalFrame>
  )
}

/** One check. Each load of its photos is one view in the audit log, so the links stay in the cache while they last. */
function CheckItem({ check }: { check: Check }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const [rejecting, setRejecting] = useState(false)
  const photos = useQuery({
    queryKey: [...queryKeys.idChecks, check.id, 'photos'],
    queryFn: () => api(user, `/v1/admin/verifications/${check.id}/photos`, idCheckPhotosResponse, { method: 'POST' }),
    staleTime: 4 * 60_000,
    refetchOnWindowFocus: false,
  })
  const review = useMutation({
    mutationFn: (body: ReviewCheckBody) => api(user, `/v1/admin/verifications/${check.id}/review`, noContent, { method: 'POST', body }),
    onSuccess: () => {
      setRejecting(false)
      return queryClient.invalidateQueries({ queryKey: queryKeys.idChecks })
    },
  })
  const name = check.name ?? 'This person'

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-secondary p-4 md:p-5">
      <div className="flex items-start gap-3">
        {check.photoUrl
          ? <img src={check.photoUrl} alt="" className="size-16 shrink-0 rounded-full object-cover" />
          : <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-tertiary text-fg-quaternary"><User01 size={20} aria-hidden /></span>}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-primary">{check.name ?? 'No profile'}</span>
            <Badge tone="gray" dot={false}>{documentTypeLabels[check.documentType]}</Badge>
          </p>
          <p className="text-sm text-tertiary">Sent {ago(check.sentAt)}{check.earlierChecks > 0 && ` · ${check.earlierChecks === 1 ? 'Second check' : `Check ${check.earlierChecks + 1}`}`}</p>
          <p className="text-sm text-tertiary">{faceLine(check.faceMatch)}</p>
        </div>
      </div>
      {photos.isError && <p role="alert" className="text-sm text-error-primary">{errorText(photos.error)}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[3fr_2fr]">
        {(['idPhotoUrl', 'selfieUrl'] as const).map((field) => (
          <figure key={field} className="flex flex-col gap-1.5">
            {photos.data
              ? <img src={photos.data[field]} alt={field === 'idPhotoUrl' ? `The ID photo of ${name}` : `The selfie of ${name}`} className="aspect-4/3 w-full rounded-lg bg-tertiary object-contain" />
              : <span className="aspect-4/3 w-full rounded-lg bg-tertiary" />}
            <figcaption className="text-xs text-tertiary">{field === 'idPhotoUrl' ? 'ID photo' : 'Selfie'}</figcaption>
          </figure>
        ))}
      </div>
      {review.isError && <p role="alert" className="text-sm text-error-primary">{errorText(review.error)}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" iconLeading={CheckCircle} disabled={review.isPending} onClick={() => review.mutate({ action: 'approve' })}>Approve</Button>
        <Button variant="destructive" size="sm" disabled={review.isPending} onClick={() => setRejecting(true)}>Reject</Button>
      </div>
      {rejecting && (
        <RejectDialog name={name} busy={review.isPending} onClose={() => setRejecting(false)}
          onReject={(reason, note) => review.mutate({ action: 'reject', reason, note })} />
      )}
    </li>
  )
}

/** The checks in review, oldest first (T-46). Only the accounts in REVIEWER_UIDS open this screen. */
export function IdChecks() {
  const checks = useIdChecks()
  if (checks.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(checks.error)}</p>
  if (!checks.data) return <p className="text-sm text-tertiary">Loading…</p>
  if (!checks.data.checks.length) return <EmptyState icon={CheckCircle} title="No checks to review">New checks show here, oldest first.</EmptyState>
  return <ul className="flex flex-col gap-4">{checks.data.checks.map((c) => <CheckItem key={c.id} check={c} />)}</ul>
}
