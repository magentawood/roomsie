'use client'

import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { errorText } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Button } from '../ui/button'

/** The designs have no log out, so drafts section 28 draws this row. */
export function LogOutRow() {
  const { signOut } = useAuth()
  const router = useRouter()
  const logOut = useMutation({ mutationFn: signOut, onSuccess: () => router.replace('/') })
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex flex-col">
        <span className="text-md font-medium text-primary">Log out</span>
        <span className="text-sm text-tertiary">Sign out of Roomsie on this device.</span>
        {logOut.isError && <span role="alert" className="text-sm text-error-primary">{errorText(logOut.error)}</span>}
      </span>
      <Button variant="secondary" size="sm" disabled={logOut.isPending} onClick={() => logOut.mutate()}>Log out</Button>
    </div>
  )
}
