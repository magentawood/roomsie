'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import { ArrowLeft, ArrowRight, Trash01 } from '@untitledui/icons'
import { z } from 'zod'
import { areasResponse, incompleteListingResponse, listingResponse, type ListingEdit, type ListingResponse } from '@roomsie/contract'
import { api, ApiError, errorText } from '../../../../lib/api'
import { useAuth } from '../../../../lib/auth'
import { listingSteps, stepBody, stepCopy, stepForMissing, toEditValues, type StepId } from '../../../../lib/listing-steps'
import { FlowFrame } from '../../../../components/listings/flow-frame'
import { KindStep, NearbyStep, PeopleStep, PhotosStep, PlaceStep, RentStep, RulesStep, WhereStep } from '../../../../components/listings/steps'
import { AppShell } from '../../../../components/shell/app-shell'
import { SignInGate } from '../../../../components/shell/sign-in-gate'
import { Button } from '../../../../components/ui/button'
import { Modal } from '../../../../components/ui/modal'

const missingLabels: Record<z.infer<typeof incompleteListingResponse>['missing'][number], string> = {
  areaSlug: 'The area', pgName: 'The name of the PG', brokerage: 'Your brokerage', rates: 'The rent', flatmatesConsent: 'The tick "My flatmates agreed to be shown"',
}

function Step({ user, listing, areas, stepNumber }: { user: User; listing: ListingResponse; areas: z.infer<typeof areasResponse>['areas']; stepNumber: number }) {
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
  const [missing, setMissing] = useState<z.infer<typeof incompleteListingResponse>['missing']>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (patch: ListingEdit) => setValues((v) => ({ ...v, ...patch }))
  const stepHref = (id: StepId) => `/listings/${listing.id}/${steps.indexOf(id) + 1}`

  const save = useMutation({
    mutationFn: () => api(user, `/v1/listings/${listing.id}`, listingResponse, { method: 'PATCH', body: stepBody(listing.kind, stepId, values) }),
    onSuccess: (saved) => queryClient.setQueryData(['listing', listing.id], saved),
  })
  const publish = useMutation({
    mutationFn: () => api(user, `/v1/listings/${listing.id}/status`, listingResponse, { method: 'POST', body: { status: 'live' } }),
  })
  const remove = useMutation({
    mutationFn: () => api(user, `/v1/listings/${listing.id}`, z.null(), { method: 'DELETE' }),
    onSuccess: () => queryClient.removeQueries({ queryKey: ['listing', listing.id] }),
  })

  /** A 422 lists what is missing (T-41). Each line links to its step. */
  const handle = (err: unknown) => {
    const incomplete = err instanceof ApiError && err.status === 422 ? incompleteListingResponse.safeParse(err.body) : null
    if (incomplete?.success) {
      setMissing(incomplete.data.missing)
      setError(null)
    } else setError(errorText(err))
  }
  const go = async (target: 'next' | 'previous' | 'draft' | 'publish') => {
    setError(null)
    try {
      if (stepId !== 'kind') await save.mutateAsync()
      if (target === 'publish' && listing.status !== 'live') await publish.mutateAsync()
      await queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] })
      if (target === 'next') router.push(`/listings/${listing.id}/${stepNumber + 1}`)
      else if (target === 'previous') router.push(stepNumber > 1 ? `/listings/${listing.id}/${stepNumber - 1}` : '/listings')
      else router.push('/listings')
    } catch (err) {
      handle(err)
    }
  }
  const busy = save.isPending || publish.isPending

  const body = (() => {
    const props = { kind: listing.kind, values, set }
    const uploads = { user, listingId: listing.id, previews, addPreview: (key: string, url: string) => setPreviews((p) => ({ ...p, [key]: url })) }
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
        error={error}
        notice={missing.length > 0 && (
          <div role="alert" className="flex flex-col gap-2 rounded-md border border-error bg-badge-error p-3 text-sm text-error-primary">
            <p className="font-semibold">Add these before your listing goes live:</p>
            <ul className="flex flex-col gap-1">
              {missing.map((field) => <li key={field}><Link className="underline" href={stepHref(stepForMissing(field))}>{missingLabels[field]}</Link></li>)}
            </ul>
          </div>
        )}
        footer={(
          <>
            <span className="md:hidden"><Button variant="secondary" size="sm" iconLeading={ArrowLeft} label="Previous step" disabled={busy} onClick={() => go('previous')} /></span>
            <span className="hidden md:inline-flex"><Button variant="secondary" size="sm" iconLeading={ArrowLeft} disabled={busy} onClick={() => go('previous')}>Previous step</Button></span>
            <span className="flex-1" />
            <Button variant="tertiary" size="lg" disabled={busy} onClick={() => go('draft')}>Save as Draft</Button>
            {last
              ? <Button variant="primary" size="lg" disabled={busy} onClick={() => go('publish')}>{listing.status === 'live' ? 'Save changes' : 'Publish my listing'}</Button>
              : <Button variant="primary" size="lg" iconTrailing={ArrowRight} disabled={busy} onClick={() => go('next')}>Next</Button>}
          </>
        )}>
        {body}
      </FlowFrame>
      {confirmDelete && (
        <Modal icon={Trash01} destructive title="Delete this listing?" onClose={() => setConfirmDelete(false)}
          actions={(
            <>
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setConfirmDelete(false)}>Keep listing</Button>
              <Button variant="destructive" size="lg" className="flex-1" disabled={remove.isPending}
                onClick={() => remove.mutateAsync().then(() => queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] })).then(() => router.push('/listings'), (err: unknown) => setError(errorText(err)))}>
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
  const { user } = useAuth()
  const params = useParams<{ id: string; step: string }>()
  const stepNumber = Number(params.step)
  const listing = useQuery({ queryKey: ['listing', params.id], queryFn: () => api(user!, `/v1/listings/${params.id}`, listingResponse), enabled: !!user })
  const areas = useQuery({ queryKey: ['areas'], queryFn: () => api(user!, '/v1/areas', areasResponse), enabled: !!user, staleTime: Infinity })
  if (listing.isError) return <p className="p-6 text-sm text-error-primary">{errorText(listing.error)}</p>
  if (!user || !listing.data || !areas.data) return <p className="p-6 text-sm text-tertiary">Loading…</p>
  const steps = listingSteps(listing.data.kind)
  if (!Number.isInteger(stepNumber) || stepNumber < 1 || stepNumber > steps.length) return <p className="p-6 text-sm text-tertiary">This step does not exist.</p>
  return <Step key={`${listing.data.id}-${stepNumber}`} user={user} listing={listing.data} areas={areas.data.areas} stepNumber={stepNumber} />
}

export default function ListingStepPage() {
  return (
    <SignInGate>
      <AppShell mobileNav={false}>
        <ListingStep />
      </AppShell>
    </SignInGate>
  )
}
