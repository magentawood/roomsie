'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight } from '@untitledui/icons'
import { listingResponse, type ListingKind, type ListingResponse } from '@roomsie/contract'
import { api, errorText } from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import { listingSteps, stepCopy } from '../../../lib/listing-steps'
import { FlowFrame } from '../../../components/listings/flow-frame'
import { KindStep } from '../../../components/listings/steps'
import { AppShell } from '../../../components/shell/app-shell'
import { SignInGate } from '../../../components/shell/sign-in-gate'
import { Button } from '../../../components/ui/button'

/** Step 1 of a new listing. "Next" makes the draft with its kind (T-41). */
function NewListing() {
  const { user } = useAuth()
  const router = useRouter()
  const [kind, setKind] = useState<ListingKind | null>(null)
  const create = useMutation<ListingResponse, Error, 'next' | 'draft'>({
    mutationFn: () => api(user!, '/v1/listings', listingResponse, { method: 'POST', body: { kind } }),
    onSuccess: (listing, destination) => router.replace(destination === 'next' ? `/listings/${listing.id}/2` : '/listings'),
  })
  const blocked = !kind || create.isPending || create.isSuccess
  return (
    <FlowFrame step={1} total={listingSteps(kind).length} title={stepCopy.kind.title} helper={stepCopy.kind.helper}
      error={create.isError ? errorText(create.error) : null}
      previous={{ href: '/listings' }}
      actions={(
        <>
          <Button variant="tertiary" size="lg" disabled={blocked} onClick={() => create.mutate('draft')}>Save as Draft</Button>
          <Button variant="primary" size="lg" iconTrailing={ArrowRight} disabled={blocked} onClick={() => create.mutate('next')}>Next</Button>
        </>
      )}>
      <KindStep kind={kind} onPick={setKind} />
    </FlowFrame>
  )
}

export default function NewListingPage() {
  return (
    <SignInGate>
      <AppShell mobileNav={false}>
        <NewListing />
      </AppShell>
    </SignInGate>
  )
}
