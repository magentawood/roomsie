'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CheckSquare, Edit05, Home02, Key01, Plus, RefreshCw01, SlashCircle01 } from '@untitledui/icons'
import { listingResponse, listingTitle, myListingsResponse, type ListingResponse, type ListingStatusBody } from '@roomsie/contract'
import { api, errorText, missingFields } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { queryKeys, useAreaLabels } from '../../lib/queries'
import { cardActions, listingSteps, rentLine, resumeStep, stepCopy, type CardAction } from '../../lib/listing-steps'
import { AppShell, PageHeader } from '../../components/shell/app-shell'
import { listingSignIn, SignInGate } from '../../components/shell/sign-in-gate'
import { MissingNotice } from '../../components/listings/missing-notice'
import { Badge, type Tone } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { EmptyState } from '../../components/ui/empty-state'

const statusBadge: Record<ListingResponse['status'], { tone: Tone; label: string }> = {
  live: { tone: 'success', label: 'Live' },
  inactive: { tone: 'error', label: 'Inactive' },
  filled: { tone: 'gray', label: 'Filled' },
  draft: { tone: 'gray', label: 'Draft' },
}

function ListingCard({ listing, areaName }: { listing: ListingResponse; areaName?: string }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const status = useMutation({
    mutationFn: (to: ListingStatusBody['status']) => api(user, `/v1/listings/${listing.id}/status`, listingResponse, { method: 'POST', body: { status: to } satisfies ListingStatusBody }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myListings }),
  })
  const missing = status.isError ? missingFields(status.error) : null
  const address = [listing.building, listing.street, areaName].filter(Boolean).join(', ')
  const resume = listing.status === 'draft' ? resumeStep(listing) : null
  const steps = listingSteps(listing.kind)
  const action = (a: CardAction) => {
    const common = { variant: 'secondary' as const, size: 'xs' as const, disabled: status.isPending }
    switch (a) {
      case 'edit': return <Button key={a} {...common} iconLeading={Edit05} href={`/listings/${listing.id}/1`}>Edit</Button>
      case 'continue': return <Button key={a} {...common} iconLeading={ArrowRight} href={`/listings/${listing.id}/${resume}`}>Continue</Button>
      case 'filled': return <Button key={a} {...common} iconLeading={CheckSquare} onClick={() => status.mutate('filled')}>Mark as filled</Button>
      case 'deactivate': return <Button key={a} {...common} iconLeading={SlashCircle01} onClick={() => status.mutate('inactive')}>Deactivate</Button>
      case 'live': return <Button key={a} {...common} iconLeading={RefreshCw01} onClick={() => status.mutate('live')}>Go live again</Button>
    }
  }
  const photo = listing.photos[0]
  return (
    <li className="flex flex-col gap-3 rounded-md border border-secondary bg-primary p-4 md:flex-row md:flex-wrap md:items-center md:gap-5 md:p-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {photo
          ? <img src={photo.url} alt="" className="size-16 shrink-0 rounded-sm border border-primary object-cover" />
          : <span className="flex size-16 shrink-0 items-center justify-center rounded-sm border border-primary bg-secondary text-fg-quaternary"><Home02 size={24} aria-hidden /></span>}
        <div className="flex min-w-0 flex-col gap-1 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-secondary">{listingTitle(listing)}</span>
            {listing.hidden
              ? <Badge tone="error">Hidden for review</Badge>
              : <Badge tone={statusBadge[listing.status].tone}>{statusBadge[listing.status].label}</Badge>}
          </div>
          {resume
            ? <span className="font-medium text-secondary">Step {resume} of {steps.length} · {stepCopy[steps[resume - 1]!].title}</span>
            : address && <span className="font-medium text-secondary">{address}</span>}
          <span className="font-medium text-secondary">{rentLine(listing)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{cardActions[listing.status].map(action)}</div>
      {missing && <div className="md:basis-full"><MissingNotice listing={listing} missing={missing} /></div>}
      {status.isError && !missing && <p role="alert" className="text-sm text-error-primary md:basis-full">{errorText(status.error)}</p>}
    </li>
  )
}

function MyListings() {
  const user = useUser()
  const mine = useQuery({ queryKey: queryKeys.myListings, queryFn: () => api(user, '/v1/listings/mine', myListingsResponse) })
  const areaLabels = useAreaLabels()
  return (
    <>
      <PageHeader title="My Listings" backHref="/" inPhoneBar />
      <main className="flex flex-1 flex-col gap-3 px-5 py-5 md:px-6 md:py-8">
        {mine.isError && <p role="alert" className="text-sm text-error-primary">{errorText(mine.error)}</p>}
        {mine.isPending && <p className="text-sm text-tertiary">Loading…</p>}
        {mine.data && mine.data.listings.length === 0 && (
          <EmptyState icon={Key01} title="No listings yet" action={<Button variant="primary" size="md" iconLeading={Plus} href="/listings/new">New listing</Button>}>
            List a room in your flat, a whole flat, or a PG or hostel. People who look in your area can then find it.
          </EmptyState>
        )}
        {mine.data && mine.data.listings.length > 0 && (
          <>
            <ul className="flex flex-col gap-3">
              {mine.data.listings.map((l) => <ListingCard key={l.id} listing={l} areaName={l.areaSlug ? areaLabels[l.areaSlug] : undefined} />)}
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
    <SignInGate {...listingSignIn}>
      <AppShell>
        <MyListings />
      </AppShell>
    </SignInGate>
  )
}
