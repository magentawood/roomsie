'use client'

import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { listingTitle, noContent, requestExpiryDays, type IncomingRequest } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { requestTimes } from '../../lib/messages'
import { aboutLine, budgetLine, lookingFor } from '../../lib/person'
import { firstName } from '../../lib/profile-form'
import { queryKeys, useIncomingRequests, useListing, usePerson } from '../../lib/queries'
import { Button } from '../ui/button'
import { Avatar, RequestsIcon } from './parts'

/** Accepts or declines a request to the user, from the requests or from the card of its sender. */
export function useAnswerRequest(requestId: string, fromProfileId: string, onAccepted?: () => void) {
  const user = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: 'accept' | 'decline') => api(user, `/v1/requests/${requestId}/${action}`, noContent, { method: 'POST' }),
    onSuccess: async (_, action) => {
      const changed = [queryKeys.person(fromProfileId), queryKeys.requests('incoming'), ...(action === 'accept' ? [queryKeys.conversations] : [])]
      await Promise.all(changed.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
      if (action === 'accept') onAccepted?.()
    },
  })
}

function RequestCard({ request }: { request: IncomingRequest }) {
  const router = useRouter()
  const { from, listingId } = request
  const person = usePerson(from.profileId)
  const listing = useListing(listingId)
  const first = firstName(from.name)
  // The accepted request is the conversation, with the same id.
  const answer = useAnswerRequest(request.id, from.profileId, () => router.push(`/messages/${request.id}`))
  const card = person.data
  return (
    <li className="flex flex-col gap-4 rounded-xl border border-secondary p-4 md:p-5">
      <div className="flex items-start gap-3">
        <Avatar photoUrl={from.photoUrl} name={from.name} />
        <div className="flex min-w-0 flex-1 flex-col text-sm">
          <p className="font-semibold text-primary">{from.name}</p>
          {card && <p className="text-tertiary">{[lookingFor(card), aboutLine(card)].filter(Boolean).join(' · ')}</p>}
          {card && <p className="text-tertiary">{budgetLine(card)}</p>}
          {listing.data && <p className="text-tertiary">About your listing: {listingTitle(listing.data)}</p>}
        </div>
        <Button variant="secondary" size="sm" href={`/people/${from.profileId}`}>View profile</Button>
      </div>
      <div className="flex flex-col gap-1 rounded-lg border border-secondary bg-secondary p-3 text-sm">
        <p className="text-xs text-tertiary">{`${first}’s note`}</p>
        <p className="whitespace-pre-line text-secondary">{request.note}</p>
      </div>
      {answer.isError && <p role="alert" className="text-sm text-error-primary">{errorText(answer.error)}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-tertiary">{requestTimes(request.createdAt, request.expiresAt)}</p>
        <div className="flex gap-3">
          <Button variant="secondary" size="md" disabled={answer.isPending} onClick={() => answer.mutate('decline')}>Decline</Button>
          <Button variant="primary" size="md" disabled={answer.isPending} onClick={() => answer.mutate('accept')}>Accept</Button>
        </div>
      </div>
    </li>
  )
}

/** The requests to the user, as section 09 of the drafts. */
export function Requests() {
  const incoming = useIncomingRequests(true)
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex items-center gap-3 border-b border-secondary px-4 py-3 md:px-6">
        <RequestsIcon />
        <div className="flex flex-col text-sm">
          <h1 className="text-md font-semibold text-primary">Requests</h1>
          <p className="text-tertiary">People who want to say hi. {`Each request closes after ${requestExpiryDays} days.`}</p>
        </div>
      </header>
      <div className="p-4 md:px-6">
        {incoming.isError && <p role="alert" className="text-sm text-error-primary">{errorText(incoming.error)}</p>}
        {incoming.isPending && <p className="text-sm text-tertiary">Loading…</p>}
        {incoming.data?.requests.length === 0 && <p className="text-sm text-tertiary">No requests right now.</p>}
        <ul className="flex flex-col gap-4">{incoming.data?.requests.map((r) => <RequestCard key={r.id} request={r} />)}</ul>
      </div>
    </div>
  )
}
