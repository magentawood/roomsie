'use client'

import { Bookmark } from '@untitledui/icons'
import { errorText } from '../../lib/api'
import { useAreaLabels, useSavedPeople, useSavedPlaces } from '../../lib/queries'
import { PlaceCard } from '../listings/place-card'
import { PersonCard } from '../people/person-card'
import { Button } from '../ui/button'
import { EmptyState } from '../ui/empty-state'
import { SaveButton } from './save-button'
import { Loading } from '../ui/loading'

export function SavedPlaces() {
  const places = useSavedPlaces()
  const areaLabels = useAreaLabels()
  if (places.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(places.error)}</p>
  if (places.isPending) return <Loading mascot="loving" />
  if (!places.data.places.length) {
    return (
      <EmptyState icon={Bookmark} title="Nothing saved yet" className="pt-29 lg:pt-30" action={<Button variant="primary" size="md" href="/">Start looking</Button>}>
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

export function SavedPeople() {
  const people = useSavedPeople()
  if (people.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(people.error)}</p>
  if (people.isPending) return <Loading mascot="loving" />
  if (!people.data.people.length) return <EmptyState icon={Bookmark} title="No people saved yet" className="pt-29 lg:pt-30">Select Save on a person to keep them here.</EmptyState>
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {people.data.people.map((card) => <li key={card.id}><PersonCard card={card} action={<SaveButton kind="people" id={card.id} />} /></li>)}
    </ul>
  )
}
