'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../../lib/auth'
import { Button } from '../ui/button'
import { CloseButton, ModalFrame } from '../ui/modal'

/** The mark of Google, in the colours that its sign-in buttons must keep. */
const GoogleMark = () => <img src="/icons/google.svg" alt="" width={20} height={20} className="shrink-0" />

/** "Sign in with Google": the sidebar of a guest and the wall. */
export function GoogleSignIn({ size = 'md', onSignedIn }: { size?: 'md' | 'lg'; onSignedIn?: () => void }) {
  const { signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" size={size} iconLeading={GoogleMark} className="w-full"
        onClick={() => signIn().then(() => { setError(null); onSignedIn?.() }, (err: unknown) => setError(String(err)))}>
        Sign in with Google
      </Button>
      {error && <p role="alert" className="text-sm text-error-primary">{error}</p>}
    </div>
  )
}

/**
 * "Sign in to continue" of drafts section 17, with the text of D-02: a modal on a desktop and a sheet on a phone.
 * The close keeps the person on the screen. T-21 shows it at the turn cap.
 */
export function SignInWall({ onClose, onSignedIn }: { onClose: () => void; onSignedIn: () => void }) {
  return (
    <ModalFrame labelledBy="sign-in-wall-title" onClose={onClose} sheet>
      <div className="flex flex-col gap-8 p-6">
        <div className="flex flex-col gap-4">
          <span aria-hidden className="mx-auto -mt-3 h-1 w-9 rounded-full bg-quaternary sm:hidden" />
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="sign-in-wall-title" className="text-lg font-semibold text-primary">Sign in to continue</h2>
              <p className="text-sm text-tertiary">Unlimited chats and multiple goals, all synced up with your account.</p>
            </div>
            <CloseButton onClose={onClose} />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <GoogleSignIn size="lg" onSignedIn={onSignedIn} />
          <p className="text-center text-xs text-tertiary">
            By continuing, you agree to the <Link href="/terms" className="underline">Terms of use</Link> and
            the <Link href="/privacy" className="underline">Privacy policy</Link>.
          </p>
        </div>
      </div>
    </ModalFrame>
  )
}
