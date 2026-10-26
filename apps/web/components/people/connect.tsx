'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, MessageCircle01 } from '@untitledui/icons'
import { noContent, type PersonResponse } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { connectView, type ConnectView } from '../../lib/person'
import { queryKeys } from '../../lib/queries'
import { Button } from '../ui/button'

function Received({ person, requestId, note, line }: { person: PersonResponse; requestId: string; note: string; line: string | null }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const answer = useMutation({
    mutationFn: (action: 'accept' | 'decline') => api(user, `/v1/requests/${requestId}/${action}`, noContent, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.person(person.id) }),
  })
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-secondary">{line}</p>
      <p className="rounded-lg border border-secondary bg-secondary p-3 text-sm text-tertiary">{note}</p>
      {answer.isError && <p role="alert" className="text-sm text-error-primary">{errorText(answer.error)}</p>}
      <div className="flex gap-3">
        <Button variant="secondary" size="lg" className="flex-1" disabled={answer.isPending} onClick={() => answer.mutate('decline')}>Decline</Button>
        <Button variant="primary" size="lg" className="flex-1" disabled={answer.isPending} onClick={() => answer.mutate('accept')}>Accept</Button>
      </div>
    </div>
  )
}

function ConnectButton({ view, name, onSayHi }: { view: ConnectView; name: string; onSayHi: () => void }) {
  switch (view.kind) {
    case 'sent': return <Button variant="secondary" size="lg" className="w-full" iconLeading={Clock} disabled>Request sent</Button>
    // TODO(T-45): open the chat.
    case 'chat': return <Button variant="primary" size="lg" className="w-full" iconLeading={MessageCircle01} disabled>{`Open chat with ${name}`}</Button>
    case 'say_hi_again': return <Button variant="secondary" size="lg" className="w-full" iconLeading={MessageCircle01} disabled={view.disabled} onClick={onSayHi}>Say hi again</Button>
    default: return <Button variant="primary" size="lg" className="w-full" iconLeading={MessageCircle01} disabled={view.disabled} onClick={onSayHi}>{`Say hi to ${name}`}</Button>
  }
}

/** The connect area of the person detail, in each state of PD17. */
export function Connect({ person, name, onSayHi }: { person: PersonResponse; name: string; onSayHi: () => void }) {
  const { connection } = person
  const view = connectView(connection, person.requestsLeftToday, name)
  if (connection.state === 'received') return <Received person={person} requestId={connection.requestId} note={connection.note} line={view.line} />
  return (
    <div className="flex flex-col gap-2">
      <ConnectButton view={view} name={name} onSayHi={onSayHi} />
      {view.line && <p className="text-center text-sm text-tertiary">{view.line}</p>}
    </div>
  )
}
