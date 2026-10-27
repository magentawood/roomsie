'use client'

import { useState } from 'react'
import { Bookmark } from '@untitledui/icons'
import { errorText } from '../../lib/api'
import type { SavedKind } from '@roomsie/contract'
import { useAreaLabels, useSavedPeople, useSavedPlaces } from '../../lib/queries'
import { PlaceCard } from '../../components/listings/place-card'
import { PersonCard } from '../../components/people/person-card'
import { SaveButton } from '../../components/saved/save-button'
import { AppShell, PageHeader } from '../../components/shell/app-shell'
import { SignInGate } from '../../components/shell/sign-in-gate'
import { Button } from '../../components/ui/button'
import { EmptyState } from '../../components/ui/empty-state'
import { Tabs } from '../../components/ui/tabs'

function Places() {
  const places = useSavedPlaces()
  const areaLabels = useAreaLabels()
  if (places.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(places.error)}</p>
  if (places.isPending) return <p className="text-sm text-tertiary">Loading…</p>
  if (!places.data.places.length) {
    return (
      <EmptyState icon={Bookmark} title="Nothing saved yet" action={<Button variant="primary" size="md" href="/">Start looking</Button>}>
        Select Save on a listing or a person to keep them here. You can compare them later in the chat.
      </EmptyState>
    )
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {places.data.places.map((listing) => (
        <li key={listing.id}>
          <PlaceCard listing={listing} areaName={listing.areaSlug ? areaLabels[listing.areaSlug] : undefined} action={<SaveButton kind="places" id={listing.id} />} />
        </li>
      ))}
    </ul>
  )
}

function People() {
  const people = useSavedPeople()
  if (people.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(people.error)}</p>
  if (people.isPending) return <p className="text-sm text-tertiary">Loading…</p>
  if (!people.data.people.length) return <EmptyState icon={Bookmark} title="No people saved yet">Select Save on a person to keep them here.</EmptyState>
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {people.data.people.map((card) => <li key={card.id}><PersonCard card={card} action={<SaveButton kind="people" id={card.id} />} /></li>)}
    </ul>
  )
}

function Saved() {
  const [tab, setTab] = useState<SavedKind>('places')
  return (
    <>
      <PageHeader title="Saved" backHref="/" inPhoneBar />
      <main className="flex flex-1 flex-col gap-5 px-5 py-5 md:px-6 md:py-8">
        <Tabs label="Saved" tabs={{ places: 'Places', people: 'People' }} value={tab} onChange={setTab} />
        <div role="tabpanel" className="flex flex-1 flex-col">
          {tab === 'places' ? <Places /> : <People />}
        </div>
      </main>
    </>
  )
}

export default function SavedPage() {
  return (
    <SignInGate title="Sign in to see what you saved" text="Saved keeps the places and people that you want to see again.">
      <AppShell>
        <Saved />
      </AppShell>
    </SignInGate>
  )
}
