'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { errorText } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { GoogleMark } from '../shell/google-sign-in'
import { Button } from '../ui/button'

/** The server cannot know the person, so this button changes after load: a guest signs in and goes to the chat. */
export function HeaderAction() {
  const { user, loading, signIn } = useAuth()
  const router = useRouter()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (user && signingIn) router.push('/chat')
  }, [user, signingIn, router])

  if (loading) return <span aria-hidden className="h-10 w-28" />
  if (user) return <Button variant="secondary" size="md" href="/chat">Open Roomsie</Button>
  return (
    <span className="relative">
      <Button variant="secondary" size="md" iconLeading={GoogleMark}
        onClick={() => { setError(null); setSigningIn(true); signIn().catch((err: unknown) => setError(errorText(err))) }}>
        <span className="md:hidden">Sign in</span>
        <span className="hidden md:inline">Sign in with Google</span>
      </Button>
      {error && <span role="alert" className="absolute top-full right-0 mt-1 w-60 text-right text-sm text-error-primary">{error}</span>}
    </span>
  )
}
