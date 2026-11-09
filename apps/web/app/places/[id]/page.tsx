'use client'

import { useParams } from 'next/navigation'
import { useListing } from '../../../lib/queries'
import { PlaceDetail } from '../../../components/places/place-detail'
import { AppShell } from '../../../components/shell/app-shell'
import { SignInGate } from '../../../components/shell/sign-in-gate'
import { Unavailable, useBack } from '../../../components/detail/parts'
import { savedHref } from '../../../lib/saved'
import { Loading } from '../../../components/ui/loading'

function Place() {
  const { id } = useParams<{ id: string }>()
  const back = useBack(savedHref.places)
  const listing = useListing(id)
  if (listing.isError) return <Unavailable kind="place" error={listing.error} onBack={back} />
  if (listing.isPending) return <Loading mascot="looking" />
  return <PlaceDetail listing={listing.data} />
}

export default function PlacePage() {
  return (
    <SignInGate mascot="looking" title="Sign in to see this place" text="The full detail of a place, and its lister, are for signed-in people.">
      <AppShell mobileNav={false}>
        <Place />
      </AppShell>
    </SignInGate>
  )
}
