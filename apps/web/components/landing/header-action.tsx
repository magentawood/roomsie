'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { errorText } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { firebaseAuth } from '../../lib/firebase'
import { GoogleMark } from '../shell/google-sign-in'
import { Button } from '../ui/button'

/** The server cannot know the person, so this button changes after load: a guest signs in and goes to the chat. */
export function HeaderAction() {
  const { user, loading, signIn } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const signInToChat = () => {
    setError(null)
    // signIn also resolves when the person closes the popup, so only a signed-in person moves on.
    signIn().then(() => { if (firebaseAuth().currentUser) router.push('/chat') }, (err: unknown) => setError(errorText(err)))
  }

  if (loading) return <span aria-hidden className="h-8 w-22 xl:h-10 xl:w-45" />
  if (user) return <Button variant="secondary" size="md" href="/chat">Open Roomsie</Button>
  return (
    <span className="relative">
      <Button variant="secondary" size="md" iconLeading={GoogleMark} onClick={signInToChat}>
        <span className="md:hidden">Sign in</span>
        <span className="hidden md:inline">Sign in with Google</span>
      </Button>
      {error && <span role="alert" className="absolute top-full right-0 mt-1 w-60 text-right text-sm text-error-primary">{error}</span>}
    </span>
  )
}
