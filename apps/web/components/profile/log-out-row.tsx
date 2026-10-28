'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth'
import { Button } from '../ui/button'

/** The designs have no log out, so drafts section 28 draws this row. */
export function LogOutRow() {
  const { signOut } = useAuth()
  const router = useRouter()
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex flex-col"><span className="text-md font-medium text-primary">Log out</span><span className="text-sm text-tertiary">Sign out of Roomsie on this device.</span></span>
      <Button variant="secondary" size="sm" onClick={() => signOut().then(() => router.replace('/'))}>Log out</Button>
    </div>
  )
}
