'use client'

import { useParams } from 'next/navigation'
import { ArrowLeft, User01 } from '@untitledui/icons'
import { ApiError, errorText } from '../../../lib/api'
import { usePerson } from '../../../lib/queries'
import { PersonDetail } from '../../../components/people/person-detail'
import { AppShell } from '../../../components/shell/app-shell'
import { SignInGate } from '../../../components/shell/sign-in-gate'
import { useBack } from '../../../components/detail/parts'
import { Button } from '../../../components/ui/button'
import { EmptyState } from '../../../components/ui/empty-state'

function Person() {
  const { id } = useParams<{ id: string }>()
  const back = useBack()
  const person = usePerson(id)
  if (person.isError) {
    if (!(person.error instanceof ApiError && [400, 404].includes(person.error.status))) return <p role="alert" className="p-6 text-sm text-error-primary">{errorText(person.error)}</p>
    // A hidden card, a block, an unknown card and a bad id look the same, so a block does not show.
    return (
      <main className="flex flex-1 flex-col px-5 py-5 md:px-6">
        <span><Button variant="secondary" size="xs" iconLeading={ArrowLeft} label="Back" onClick={back} /></span>
        <EmptyState icon={User01} title="This card is not available"
          action={<div className="flex gap-3"><Button variant="secondary" size="md" href="/saved">See saved people</Button><Button variant="primary" size="md" href="/">Start looking</Button></div>}>
          The person hid the card, or it is no longer on roomsie.
        </EmptyState>
      </main>
    )
  }
  if (person.isPending) return <p className="p-6 text-sm text-tertiary">Loading…</p>
  return <PersonDetail person={person.data} />
}

export default function PersonPage() {
  return (
    <SignInGate title="Sign in to open this card" text="Cards and Say hi are for signed-in people.">
      <AppShell mobileNav={false}>
        <Person />
      </AppShell>
    </SignInGate>
  )
}
