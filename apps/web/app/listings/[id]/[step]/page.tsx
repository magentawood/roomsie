'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Trash01 } from '@untitledui/icons'
import { z } from 'zod'
import { listingResponse, type AreasResponse, type GoLiveField, type ListingEdit, type ListingResponse, type ListingStatusBody } from '@roomsie/contract'
import { api, errorText, missingFields } from '../../../../lib/api'
import { useUser } from '../../../../lib/auth'
import { listingSteps, stepBody, stepCopy, stepErrors, toEditValues, type StepId } from '../../../../lib/listing-steps'
import { queryKeys, useAreas } from '../../../../lib/queries'
import { FlowFrame } from '../../../../components/listings/flow-frame'
import { MissingNotice } from '../../../../components/listings/missing-notice'
import { KindStep, NearbyStep, PeopleStep, PhotosStep, PlaceStep, RentStep, RulesStep, WhereStep } from '../../../../components/listings/steps'
import { AppShell } from '../../../../components/shell/app-shell'
import { listingSignIn, SignInGate } from '../../../../components/shell/sign-in-gate'
import { Button } from '../../../../components/ui/button'
import { Modal } from '../../../../components/ui/modal'

function Step({ listing, areas, stepNumber }: { listing: ListingResponse; areas: AreasResponse['areas']; stepNumber: number }) {
  const user = useUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const steps = listingSteps(listing.kind)
  const stepId: StepId = steps[stepNumber - 1]!
  const last = stepNumber === steps.length
  const [values, setValues] = useState<ListingEdit>(() => toEditValues(listing))
  const [previews, setPreviews] = useState<Record<string, string>>(() => Object.fromEntries([
    ...listing.photos.map((p) => [p.key, p.url]),
    ...listing.flatmates.flatMap((f) => (f.photoKey && f.photoUrl ? [[f.photoKey, f.photoUrl]] : [])),
  ]))
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState<GoLiveField[]>([])
  const [checked, setChecked] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (patch: ListingEdit) => setValues((v) => ({ ...v, ...patch }))

  const save = useMutation({
    mutationFn: () => api(user, `/v1/listings/${listing.id}`, listingResponse, { method: 'PATCH', body: stepBody(listing.kind, stepId, values) }),
    // The saved text is masked (PD17), so the form shows the saved values if the step stays open.
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.listing(listing.id), saved)
      setValues(toEditValues(saved))
    },
  })
  const publish = useMutation({
    mutationFn: () => api(user, `/v1/listings/${listing.id}/status`, listingResponse, { method: 'POST', body: { status: 'live' } satisfies ListingStatusBody }),
  })
  const remove = useMutation({
    mutationFn: () => api(user, `/v1/listings/${listing.id}`, z.null(), { method: 'DELETE' }),
    onSuccess: () => queryClient.removeQueries({ queryKey: queryKeys.listing(listing.id) }),
  })

  // The check before each save. Its lines show after the first refused save, then follow each change.
  const refused = stepErrors(listing.kind, stepBody(listing.kind, stepId, values))
  const errors = checked ? refused : {}
  const hasErrors = Object.keys(errors).length > 0

  const saveAndGo = async (target: 'next' | 'previous' | 'draft' | 'publish') => {
    setError(null)
    if (Object.keys(refused).length) {
      setChecked(true)
      // The red lines show on the next render. Then the first refused field gets the focus, so it scrolls into view.
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    try {
      if (stepId !== 'kind') await save.mutateAsync()
      if (target === 'publish') await publish.mutateAsync()
      await queryClient.invalidateQueries({ queryKey: queryKeys.myListings })
      if (target === 'next') router.push(`/listings/${listing.id}/${stepNumber + 1}`)
      else if (target === 'previous') router.push(stepNumber > 1 ? `/listings/${listing.id}/${stepNumber - 1}` : '/listings')
      else router.push('/listings')
    } catch (err) {
      const fields = missingFields(err)
      if (fields) setMissing(fields)
      setError(fields ? null : errorText(err))
    }
  }
  const busy = save.isPending || publish.isPending

  const stepContent = (() => {
    const props = { kind: listing.kind, values, set, errors }
    const uploads = { listingId: listing.id, previews, addPreview: (key: string, url: string) => setPreviews((p) => ({ ...p, [key]: url })) }
    switch (stepId) {
      case 'kind':
        return (
          <>
            <KindStep kind={listing.kind} />
            <div><Button variant="link-error" iconLeading={Trash01} onClick={() => setConfirmDelete(true)}>Delete listing</Button></div>
          </>
        )
      case 'where': return <WhereStep {...props} areas={areas} />
      case 'nearby': return <NearbyStep {...props} />
      case 'place': return <PlaceStep {...props} />
      case 'rent': return <RentStep {...props} />
      case 'rules': return <RulesStep {...props} />
      case 'people': return <PeopleStep {...props} {...uploads} />
      case 'photos': return <PhotosStep {...props} {...uploads} />
    }
  })()

  return (
    <>
      <FlowFrame step={stepNumber} total={steps.length} title={stepCopy[stepId].title}
        helper={stepId === 'kind' ? 'The kind of a listing can’t change. To list a different kind, make a new listing.' : stepCopy[stepId].helper}
        error={error ?? (hasErrors ? 'Fix the fields in red, then try again.' : null)}
        notice={missing.length > 0 && <MissingNotice listing={listing} missing={missing} />}
        previous={{ disabled: busy, onClick: () => saveAndGo('previous') }}
        actions={(
          <>
            <Button variant="tertiary" size="lg" disabled={busy} onClick={() => saveAndGo('draft')}>Save as Draft</Button>
            {/* A listing that has been live goes live again from its card, so its last step only saves. */}
            {last && listing.status === 'draft' && <Button variant="primary" size="lg" disabled={busy} onClick={() => saveAndGo('publish')}>Publish my listing</Button>}
            {last && listing.status !== 'draft' && <Button variant="primary" size="lg" disabled={busy} onClick={() => saveAndGo('draft')}>Save changes</Button>}
            {!last && <Button variant="primary" size="lg" iconTrailing={ArrowRight} disabled={busy} onClick={() => saveAndGo('next')}>Next</Button>}
          </>
        )}>
        {stepContent}
      </FlowFrame>
      {confirmDelete && (
        <Modal icon={Trash01} title="Delete this listing?" onClose={() => setConfirmDelete(false)}
          actions={(
            <>
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setConfirmDelete(false)}>Keep listing</Button>
              <Button variant="destructive" size="lg" className="flex-1" disabled={remove.isPending}
                onClick={() => remove.mutateAsync().then(() => queryClient.invalidateQueries({ queryKey: queryKeys.myListings })).then(() => router.push('/listings'), (err: unknown) => setError(errorText(err)))}>
                Delete listing
              </Button>
            </>
          )}>
          Its photos are deleted too. You can&apos;t undo this.
        </Modal>
      )}
    </>
  )
}

function ListingStep() {
  const user = useUser()
  const params = useParams<{ id: string; step: string }>()
  const stepNumber = Number(params.step)
  const listing = useQuery({ queryKey: queryKeys.listing(params.id), queryFn: () => api(user, `/v1/listings/${params.id}`, listingResponse) })
  const areas = useAreas()
  if (listing.isError) return <p className="p-6 text-sm text-error-primary">{errorText(listing.error)}</p>
  if (!listing.data || !areas.data) return <p className="p-6 text-sm text-tertiary">Loading…</p>
  const steps = listingSteps(listing.data.kind)
  if (!Number.isInteger(stepNumber) || stepNumber < 1 || stepNumber > steps.length) return <p className="p-6 text-sm text-tertiary">This step does not exist.</p>
  return <Step key={`${listing.data.id}-${stepNumber}`} listing={listing.data} areas={areas.data.areas} stepNumber={stepNumber} />
}

export default function ListingStepPage() {
  return (
    <SignInGate {...listingSignIn}>
      <AppShell mobileNav={false}>
        <ListingStep />
      </AppShell>
    </SignInGate>
  )
}
