'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { errorText } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Button } from '../ui/button'
import { GoogleMark } from '../shell/google-sign-in'

/** The designs give the header button a 16 px mark on a phone and a tablet, and 20 px on a computer. */
const HeaderGoogleMark = () => <GoogleMark className="size-4 shrink-0 xl:size-5" />
/** 32 tall (padding 6 / 10) on a phone and a tablet, md (40) on a computer. */
const headerButton = 'max-xl:px-2.5 max-xl:py-1.5'

/** The server cannot know the person, so this button changes after load: a guest signs in and goes to the onboarding (T-48). */
export function HeaderAction() {
  const { user, loading, signIn } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const signInToChat = () => {
    setError(null)
    signIn().then((signedInUser) => { if (signedInUser) router.push('/start') }, (err: unknown) => setError(errorText(err)))
  }

  if (loading) return <span aria-hidden className="h-8 w-22 xl:h-10 xl:w-45" />
  if (user) return <Button variant="secondary" size="md" href="/start" className={headerButton}>Open Roomsie</Button>
  return (
    <span className="relative">
      <Button variant="secondary" size="md" iconLeading={HeaderGoogleMark} onClick={signInToChat} className={headerButton}>
        <span className="md:hidden">Sign in</span>
        <span className="hidden md:inline">Sign in with Google</span>
      </Button>
      {error && <span role="alert" className="absolute top-full right-0 mt-1 w-60 text-right text-sm text-error-primary">{error}</span>}
    </span>
  )
}
