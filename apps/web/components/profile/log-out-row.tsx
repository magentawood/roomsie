'use client'

import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { signOut } from 'firebase/auth'
import { firebaseAuth } from '../../lib/firebase'
import { Button } from '../ui/button'

/** The designs have no log out, so drafts section 28 draws this row. */
export function LogOutRow() {
  const router = useRouter()
  const queryClient = useQueryClient()
  // The cache holds the data of this account, so a next sign-in on this device must not see it.
  const logOut = () => signOut(firebaseAuth()).then(() => { queryClient.clear(); router.replace('/') })
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex flex-col"><span className="text-md font-medium text-primary">Log out</span><span className="text-sm text-tertiary">Sign out of Roomsie on this device.</span></span>
      <Button variant="secondary" size="sm" onClick={logOut}>Log out</Button>
    </div>
  )
}
