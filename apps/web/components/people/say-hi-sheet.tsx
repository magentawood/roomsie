'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { outgoingRequest, requestNoteLimit, type ListingKind } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { listerPhrase } from '../../lib/place-detail'
import { queryKeys } from '../../lib/queries'
import type { PersonTarget } from '../reports/report-sheet'
import { Button } from '../ui/button'
import { TextArea } from '../ui/field'
import { Modal } from '../ui/modal'

/** A message to a listing goes to its lister, who can have no profile (T-45). */
type ListingTarget = { listingId: string; kind: ListingKind }

/** "Say hi" sends one note as a message request (PD17), to a person or to the lister of a listing. */
export function SayHiSheet({ target, onClose }: { target: PersonTarget | ListingTarget; onClose: () => void }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const [note, setNote] = useState<string | null>(null)
  const person = 'profileId' in target
  const send = useMutation({
    mutationFn: () => api(user, '/v1/requests', outgoingRequest, {
      method: 'POST', body: person ? { toProfileId: target.profileId, note } : { listingId: target.listingId, note },
    }),
    onSuccess: () => {
      if (person) void queryClient.invalidateQueries({ queryKey: queryKeys.person(target.profileId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.requests('outgoing') })
      onClose()
    },
  })
  const name = person ? target.firstName : 'The lister'
  return (
    <Modal title={person ? `Say hi to ${target.firstName}` : `Message ${listerPhrase(target.kind)}`} onClose={onClose}
      actions={(
        <>
          <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" className="flex-1" disabled={!note || send.isPending} onClick={() => send.mutate()}>Send request</Button>
        </>
      )}>
      <div className="flex flex-col gap-4 pb-6">
        <p className="mb-5">Add a short note. {name} sees it with your card, and can accept.</p>
        <TextArea label="Your note" value={note} onChange={setNote} maxLength={requestNoteLimit} size="sm" className="h-28 py-2.75!"
          hint={`${note?.length ?? 0}/${requestNoteLimit}. Phone numbers can’t be shared on roomsie.`} />
        {send.isError && <p role="alert" className="text-error-primary">{errorText(send.error)}</p>}
      </div>
    </Modal>
  )
}
