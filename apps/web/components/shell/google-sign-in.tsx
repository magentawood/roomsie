'use client'

import { useState } from 'react'
import Link from 'next/link'
import { errorText } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Button } from '../ui/button'

/**
 * The mark of Google, in the colours that its sign-in buttons must keep. As an `iconLeading` it takes the icon size of the
 * Button; a wrapper can pass a `className` with its own sizes, as `size-4 shrink-0 xl:size-5`.
 */
export const GoogleMark = ({ size = 20, className = 'shrink-0' }: { size?: number; className?: string }) =>
  <img src="/icons/google.svg" alt="" width={size} height={size} className={className} />

/** "Sign in with Google" of D-02. */
export function GoogleSignIn({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const { signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-2">
      {/* The social button of the designs: 10 from the mark to the text (8 + the 2 of the label). */}
      <Button variant="secondary" size={size} iconLeading={GoogleMark} className={size === 'lg' ? 'w-full gap-2!' : 'w-full'}
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
