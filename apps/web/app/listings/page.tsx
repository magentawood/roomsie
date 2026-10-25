'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import { ArrowRight, CheckSquare, Edit05, Home02, Key01, Plus, RefreshCw01, SlashCircle01 } from '@untitledui/icons'
import { areasResponse, incompleteListingResponse, listingResponse, myListingsResponse, type ListingResponse } from '@roomsie/contract'
import { api, ApiError, errorText } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { cardActions, listingTitle, rentLine, type CardAction } from '../../lib/listing-steps'
import { AppShell, PageHeader } from '../../components/shell/app-shell'
import { SignInGate } from '../../components/shell/sign-in-gate'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'

const statusBadge: Record<ListingResponse['status'], { tone: 'success' | 'error' | 'gray'; label: string }> = {
  live: { tone: 'success', label: 'Live' },
  inactive: { tone: 'error', label: 'Inactive' },
  filled: { tone: 'gray', label: 'Filled' },
  draft: { tone: 'gray', label: 'Draft' },
}

function ListingCard({ user, listing, areaName }: { user: User; listing: ListingResponse; areaName?: string }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const status = useMutation({
    mutationFn: (to: 'live' | 'inactive' | 'filled') => api(user, `/v1/listings/${listing.id}/status`, listingResponse, { method: 'POST', body: { status: to } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] }),
    onError: (err) => {
      const incomplete = err instanceof ApiError && err.status === 422 ? incompleteListingResponse.safeParse(err.body) : null
      setError(incomplete?.success ? 'Some details are missing. Open Edit, then publish it again.' : errorText(err))
    },
  })
  const address = [listing.building, listing.street, areaName].filter(Boolean).join(', ')
  const action = (a: CardAction) => {
    const common = { variant: 'secondary' as const, size: 'xs' as const, disabled: status.isPending }
    switch (a) {
      case 'edit': return <Button key={a} {...common} iconLeading={Edit05} href={`/listings/${listing.id}/1`}>Edit</Button>
      case 'continue': return <Button key={a} {...common} iconLeading={ArrowRight} href={`/listings/${listing.id}/2`}>Continue</Button>
      case 'filled': return <Button key={a} {...common} iconLeading={CheckSquare} onClick={() => status.mutate('filled')}>Mark as filled</Button>
      case 'deactivate': return <Button key={a} {...common} iconLeading={SlashCircle01} onClick={() => status.mutate('inactive')}>Deactivate</Button>
      case 'live': return <Button key={a} {...common} iconLeading={RefreshCw01} onClick={() => status.mutate('live')}>Go live again</Button>
    }
  }
  const photo = listing.photos[0]
  return (
    <li className="flex flex-col gap-3 rounded-md border border-secondary bg-primary p-4 md:flex-row md:items-center md:gap-5 md:p-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {photo
          ? <img src={photo.url} alt="" className="size-16 shrink-0 rounded-sm border border-primary object-cover" />
          : <span className="flex size-16 shrink-0 items-center justify-center rounded-sm border border-primary bg-secondary text-fg-quaternary"><Home02 size={24} aria-hidden /></span>}
        <div className="flex min-w-0 flex-col gap-1 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-secondary">{listingTitle(listing)}</span>
            <Badge tone={statusBadge[listing.status].tone}>{statusBadge[listing.status].label}</Badge>
          </div>
          {address && <span className="font-medium text-secondary">{address}</span>}
          <span className="font-medium text-secondary">{rentLine(listing)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{cardActions(listing.status).map(action)}</div>
      {error && <p role="alert" className="text-sm text-error-primary md:basis-full">{error}</p>}
    </li>
  )
}

function MyListings() {
  const { user } = useAuth()
  const mine = useQuery({ queryKey: ['listings', 'mine'], queryFn: () => api(user!, '/v1/listings/mine', myListingsResponse), enabled: !!user })
  const areas = useQuery({ queryKey: ['areas'], queryFn: () => api(user!, '/v1/areas', areasResponse), enabled: !!user, staleTime: Infinity })
  const areaNames = Object.fromEntries((areas.data?.areas ?? []).map((a) => [a.slug, a.name]))
  return (
    <>
      <PageHeader title="My Listings" backHref="/" />
      <main className="flex flex-1 flex-col gap-3 px-5 py-5 md:px-6 md:py-8">
        {mine.isError && <p role="alert" className="text-sm text-error-primary">{errorText(mine.error)}</p>}
        {mine.isPending && <p className="text-sm text-tertiary">Loading…</p>}
        {mine.data && mine.data.listings.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl border border-primary text-fg-quaternary shadow-xs"><Key01 size={24} aria-hidden /></span>
            <div className="flex max-w-88 flex-col gap-1">
              <h2 className="text-md font-semibold text-primary">No listings yet</h2>
              <p className="text-sm text-tertiary">List a room in your flat, a whole flat, or a PG or hostel. People who look in your area can then find it.</p>
            </div>
            <Button variant="primary" size="md" iconLeading={Plus} href="/listings/new">New listing</Button>
          </div>
        )}
        {mine.data && mine.data.listings.length > 0 && user && (
          <>
            <ul className="flex flex-col gap-3">
              {mine.data.listings.map((l) => <ListingCard key={l.id} user={user} listing={l} areaName={l.areaSlug ? areaNames[l.areaSlug] : undefined} />)}
            </ul>
            <div><Button variant="primary" size="md" iconLeading={Plus} href="/listings/new">New listing</Button></div>
          </>
        )}
      </main>
    </>
  )
}

export default function MyListingsPage() {
  return (
    <SignInGate>
      <AppShell>
        <MyListings />
      </AppShell>
    </SignInGate>
  )
}
