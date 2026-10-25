'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight } from '@untitledui/icons'
import { listingResponse, type ListingKind } from '@roomsie/contract'
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const create = async (then: 'next' | 'draft') => {
    if (!user || !kind) return
    setBusy(true)
    try {
      const listing = await api(user, '/v1/listings', listingResponse, { method: 'POST', body: { kind } })
      router.replace(then === 'next' ? `/listings/${listing.id}/2` : '/listings')
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }
  return (
    <FlowFrame step={1} total={kind ? listingSteps(kind).length : 7} title={stepCopy.kind.title} helper={stepCopy.kind.helper} error={error}
      footer={(
        <>
          <span className="md:hidden"><Button variant="secondary" size="sm" iconLeading={ArrowLeft} href="/listings" label="Previous step" /></span>
          <span className="hidden md:inline-flex"><Button variant="secondary" size="sm" iconLeading={ArrowLeft} href="/listings">Previous step</Button></span>
          <span className="flex-1" />
          <Button variant="tertiary" size="lg" disabled={!kind || busy} onClick={() => create('draft')}>Save as Draft</Button>
          <Button variant="primary" size="lg" iconTrailing={ArrowRight} disabled={!kind || busy} onClick={() => create('next')}>Next</Button>
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
