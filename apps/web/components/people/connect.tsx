'use client'

import type { ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, MessageCircle01 } from '@untitledui/icons'
import { noContent, type PersonResponse } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { connectLine } from '../../lib/person'
import { queryKeys } from '../../lib/queries'
import { Button } from '../ui/button'

function Received({ profileId, requestId, note, line, save }: { profileId: string; requestId: string; note: string; line: string | null; save: ReactNode }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const answer = useMutation({
    mutationFn: (action: 'accept' | 'decline') => api(user, `/v1/requests/${requestId}/${action}`, noContent, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.person(profileId) }),
  })
  return (
    <div className="flex flex-col gap-3">
      <p className="text-md font-semibold text-primary">{line}</p>
      <p className="rounded-lg border border-secondary bg-secondary p-3 text-sm text-tertiary">{note}</p>
      {answer.isError && <p role="alert" className="text-sm text-error-primary">{errorText(answer.error)}</p>}
      <div className="flex gap-3">
        {save}
        <Button variant="secondary" size="lg" className="flex-1" disabled={answer.isPending} onClick={() => answer.mutate('decline')}>Decline</Button>
        <Button variant="primary" size="lg" className="flex-1" disabled={answer.isPending} onClick={() => answer.mutate('accept')}>Accept</Button>
      </div>
    </div>
  )
}

function ConnectButton({ person, name, onSayHi }: { person: PersonResponse; name: string; onSayHi: () => void }) {
  switch (person.connection.state) {
    case 'sent': return <Button variant="secondary" size="lg" className="w-full" iconLeading={Clock} disabled>Request sent</Button>
    // TODO(T-45): open the chat.
    case 'accepted': return <Button variant="primary" size="lg" className="w-full" iconLeading={MessageCircle01} disabled>{`Open chat with ${name}`}</Button>
    default: return (
      <Button variant="primary" size="lg" className="w-full" iconLeading={MessageCircle01} disabled={person.requestsLeftToday === 0} onClick={onSayHi}>
        {`Say hi to ${name}`}
      </Button>
    )
  }
}

/** The connect area of the person detail, in each state of PD17. On a phone, `save` opens the row of buttons. */
export function Connect({ person, name, onSayHi, save }: { person: PersonResponse; name: string; onSayHi: () => void; save?: ReactNode }) {
  const { connection } = person
  const line = connectLine(connection, person.requestsLeftToday, name)
  if (connection.state === 'received') return <Received profileId={person.id} requestId={connection.requestId} note={connection.note} line={line} save={save} />
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">{save}<div className="min-w-0 flex-1"><ConnectButton person={person} name={name} onSayHi={onSayHi} /></div></div>
      {line && <p className="text-center text-sm text-tertiary">{line}</p>}
    </div>
  )
}
