'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Home02 } from '@untitledui/icons'
import { ApiError, errorText } from '../../../lib/api'
import { useListing } from '../../../lib/queries'
import { PlaceDetail } from '../../../components/places/place-detail'
import { AppShell } from '../../../components/shell/app-shell'
import { SignInGate } from '../../../components/shell/sign-in-gate'
import { Button } from '../../../components/ui/button'
import { EmptyState } from '../../../components/ui/empty-state'

function Place() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const listing = useListing(id)
  if (listing.isError) {
    if (!(listing.error instanceof ApiError && listing.error.status === 404)) return <p role="alert" className="p-6 text-sm text-error-primary">{errorText(listing.error)}</p>
    return (
      <main className="flex flex-1 flex-col px-5 py-5 md:px-6">
        <span><Button variant="secondary" size="xs" iconLeading={ArrowLeft} label="Back" onClick={() => (window.history.length > 1 ? router.back() : router.push('/saved'))} /></span>
        <EmptyState icon={Home02} title="This place is no longer listed."
          action={<div className="flex gap-3"><Button variant="secondary" size="md" href="/saved">See saved places</Button><Button variant="primary" size="md" href="/">Start looking</Button></div>}>
          The lister filled, paused or removed it.
        </EmptyState>
      </main>
    )
  }
  if (listing.isPending) return <p className="p-6 text-sm text-tertiary">Loading…</p>
  return <PlaceDetail listing={listing.data} />
}

export default function PlacePage() {
  return (
    <SignInGate title="Sign in to see this place" text="The full detail of a place, and its lister, are for signed-in people.">
      <AppShell mobileNav={false}>
        <Place />
      </AppShell>
    </SignInGate>
  )
}
