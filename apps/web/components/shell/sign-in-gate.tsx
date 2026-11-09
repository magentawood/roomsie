'use client'

import type { ReactNode } from 'react'
import { useAuth } from '../../lib/auth'
import { GoogleSignIn, LegalLine } from './google-sign-in'
import { Logo } from './logo'
import { Loading, type Mascot } from '../ui/loading'

export const listingSignIn = { title: 'Sign in to list your place', text: 'Your listings stay in your account, and only you can change them.', mascot: 'home' } as const

/**
 * A screen behind sign-in (PD6b). A signed-out user sees the Google sign-in of T-05 in the design of D-02, with the title and text of the screen.
 * While the sign-in loads, the screen shows the mascot of its page.
 */
export function SignInGate({ title, text, mascot, children }: { title: string; text: string; mascot: Mascot; children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading mascot={mascot} page />
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
