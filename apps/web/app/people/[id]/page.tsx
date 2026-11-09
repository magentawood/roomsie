'use client'

import { useParams } from 'next/navigation'
import { usePerson } from '../../../lib/queries'
import { PersonDetail } from '../../../components/people/person-detail'
import { AppShell } from '../../../components/shell/app-shell'
import { SignInGate } from '../../../components/shell/sign-in-gate'
import { Unavailable, useBack } from '../../../components/detail/parts'
import { savedHref } from '../../../lib/saved'
import { Loading } from '../../../components/ui/loading'

function Person() {
  const { id } = useParams<{ id: string }>()
  const back = useBack(savedHref.people)
  const person = usePerson(id)
  if (person.isError) return <Unavailable kind="person" error={person.error} onBack={back} />
  if (person.isPending) return <Loading mascot="starry" />
  return <PersonDetail person={person.data} />
}

export default function PersonPage() {
  return (
    <SignInGate mascot="starry" title="Sign in to open this card" text="Cards and Say hi are for signed-in people.">
      <AppShell mobileNav={false}>
        <Person />
      </AppShell>
    </SignInGate>
  )
}
