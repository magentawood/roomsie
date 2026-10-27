'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { errorText } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Button } from '../ui/button'
import { Logo } from './logo'

/** The mark of Google, in the colours that its sign-in buttons must keep. */
const GoogleMark = () => <img src="/icons/google.svg" alt="" width={20} height={20} className="shrink-0" />

/** "Sign in with Google" of D-02. */
export function GoogleSignIn({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const { signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" size={size} iconLeading={GoogleMark} className="w-full"
        onClick={() => signIn().catch((err: unknown) => setError(errorText(err)))}>
        Sign in with Google
      </Button>
      {error && <p role="alert" className="text-sm text-error-primary">{error}</p>}
    </div>
  )
}

/** The legal line of drafts section 17. T-23b makes the two pages. */
export function LegalLine() {
  return (
    <p className="text-center text-xs text-tertiary">
      By continuing, you agree to the <Link href="/terms" className="underline">Terms of use</Link> and
      the <Link href="/privacy" className="underline">Privacy policy</Link>.
    </p>
  )
}

export const listingSignIn = { title: 'Sign in to list your place', text: 'Your listings stay in your account, and only you can change them.' }

/** A screen behind sign-in (PD6b). A signed-out user sees the Google sign-in of T-05 in the design of D-02, with the title and text of the screen. */
export function SignInGate({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex min-h-dvh items-center justify-center text-sm text-tertiary">Loading…</div>
  if (user) return <>{children}</>
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="flex w-full max-w-90 flex-col items-center gap-6 text-center">
        <Logo className="h-7 w-auto text-primary" />
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-semibold text-primary">{title}</h1>
          <p className="text-sm text-tertiary">{text}</p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <GoogleSignIn size="lg" />
          <LegalLine />
        </div>
      </div>
    </main>
  )
}
