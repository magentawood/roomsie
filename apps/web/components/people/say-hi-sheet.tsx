'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageCircle01 } from '@untitledui/icons'
import { outgoingRequest, requestNoteLimit } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { queryKeys } from '../../lib/queries'
import type { PersonTarget } from '../reports/report-sheet'
import { Button } from '../ui/button'
import { TextArea } from '../ui/field'
import { Modal } from '../ui/modal'

/** "Say hi" sends one note as a message request (PD17). */
export function SayHiSheet({ target: { profileId, firstName: name }, onClose }: { target: PersonTarget; onClose: () => void }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const [note, setNote] = useState<string | null>(null)
  const send = useMutation({
    mutationFn: () => api(user, '/v1/requests', outgoingRequest, { method: 'POST', body: { toProfileId: profileId, note } }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: queryKeys.person(profileId) }); onClose() },
  })
  return (
    <Modal icon={MessageCircle01} title={`Say hi to ${name}`} onClose={onClose}
      actions={(
        <>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="lg" className="flex-1" disabled={!note || send.isPending} onClick={() => send.mutate()}>Send request</Button>
        </>
      )}>
      <div className="flex flex-col gap-4">
        <p>Add a short note. {name} sees it with your card, and can accept.</p>
        <TextArea label="Your note" value={note} onChange={setNote} maxLength={requestNoteLimit}
          hint={`${note?.length ?? 0}/${requestNoteLimit}. Phone numbers can’t be shared on roomsie.`} />
        {send.isError && <p role="alert" className="text-error-primary">{errorText(send.error)}</p>}
      </div>
    </Modal>
  )
}
