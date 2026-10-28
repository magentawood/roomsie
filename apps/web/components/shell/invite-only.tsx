'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar } from '@untitledui/icons'
import type { InviteRefusal } from '@roomsie/contract'
import { useAuth } from '../../lib/auth'
import { istDay } from '../../lib/ist'
import { DeleteAccountDialog } from '../profile/delete-account-dialog'
import { Button } from '../ui/button'
import { EmptyState } from '../ui/empty-state'
import { Logo } from './logo'

/** The screen of a person that the gate refuses (T-33). An account can still delete itself. */
export function InviteOnlyScreen({ refusal }: { refusal: InviteRefusal }) {
  const { signOut } = useAuth()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const goHome = () => signOut().then(() => router.replace('/'))
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-5 py-3 md:px-16 md:py-6"><Logo className="h-7.5 w-auto text-primary" /></header>
      <main className="flex flex-1 flex-col px-5">
        <EmptyState icon={Calendar} title={refusal.opensAt ? `Roomsie opens on ${istDay(refusal.opensAt)}` : 'Roomsie opens soon'}
          action={
            <div className="flex flex-col items-center gap-3">
              <Button variant="primary" size="md" onClick={goHome}>Go home</Button>
              {refusal.account && <Button variant="tertiary" size="md" onClick={() => setDeleting(true)}>Delete my account</Button>}
            </div>
          }>
          It is invite-only until then. Come back on launch day and walk right in.
        </EmptyState>
      </main>
      {deleting && <DeleteAccountDialog onClose={() => setDeleting(false)} />}
    </div>
  )
}
