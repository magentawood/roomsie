'use client'

import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { signOut } from 'firebase/auth'
import { Trash01 } from '@untitledui/icons'
import { noContent } from '@roomsie/contract'
import { api } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { firebaseAuth } from '../../lib/firebase'
import { Button } from '../ui/button'
import { Modal } from '../ui/modal'

export function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const user = useUser()
  const router = useRouter()
  const remove = useMutation({ mutationFn: () => api(user, '/v1/me', noContent, { method: 'DELETE' }) })
  if (remove.isSuccess) {
    // A deleted account has no valid token, so sign out.
    const leave = () => signOut(firebaseAuth()).then(() => router.replace('/'))
    return (
      <Modal icon={Trash01} title="Your account is deleted." onClose={leave} actions={<Button variant="secondary" size="lg" className="flex-1" onClick={leave}>OK</Button>}>
        Your profile, photos and listings are gone. OK signs you out.
      </Modal>
    )
  }
  return (
    <Modal icon={Trash01} title="Delete your account?" onClose={onClose}
      actions={(
        <>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>Keep account</Button>
          <Button variant="destructive" size="lg" className="flex-1" disabled={remove.isPending} onClick={() => remove.mutate()}>Delete account</Button>
        </>
      )}>
      <p>Your profile, photos, listings and chats are deleted. People you talked to see “Deleted user”. You are signed out. You can’t undo this.</p>
      {remove.isError && <p role="alert" className="mt-2 text-error-primary">We could not delete your account. Try again.</p>}
    </Modal>
  )
}
