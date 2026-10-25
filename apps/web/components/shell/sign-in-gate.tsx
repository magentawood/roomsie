'use client'

import { useState, type ReactNode } from 'react'
import { useAuth } from '../../lib/auth'
import { Button } from '../ui/button'
import { Logo } from './logo'

/** The listing screens need sign-in (PD6b). A signed-out user sees the Google sign-in of T-05. */
export function SignInGate({ children }: { children: ReactNode }) {
  const { user, loading, signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)
  if (loading) return <div className="flex min-h-dvh items-center justify-center text-sm text-tertiary">Loading…</div>
  if (user) return <>{children}</>
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="flex w-full max-w-90 flex-col items-center gap-6 text-center">
        <Logo className="h-7 w-auto text-primary" />
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-semibold text-primary">Sign in to list your place</h1>
          <p className="text-sm text-tertiary">Your listings stay in your account, and only you can change them.</p>
        </div>
        <Button variant="primary" size="lg" className="w-full" onClick={() => signIn().then(() => setError(null), (err: unknown) => setError(String(err)))}>
          Continue with Google
        </Button>
        {error && <p className="text-sm text-error-primary">{error}</p>}
      </div>
    </main>
  )
}
