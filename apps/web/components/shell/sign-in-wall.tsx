'use client'

import { CloseButton, ModalFrame } from '../ui/modal'
import { GoogleSignIn, LegalLine } from './google-sign-in'

/** "Sign in to continue" of drafts section 17, with the text of D-02. T-21 shows it at the turn cap. */
export function SignInWall({ onClose }: { onClose: () => void }) {
  return (
    <ModalFrame labelledBy="sign-in-wall-title" onClose={onClose} sheet>
      <div className="flex flex-col gap-8 p-6">
        <div className="flex flex-col gap-4">
          <span aria-hidden className="mx-auto -mt-3 h-1 w-9 rounded-full bg-quaternary lg:hidden" />
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="sign-in-wall-title" className="text-lg font-semibold text-primary">Sign in to continue</h2>
              <p className="text-sm text-tertiary">Unlimited chats and multiple goals, all synced up with your account.</p>
            </div>
            <CloseButton onClose={onClose} />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <GoogleSignIn size="lg" />
          <LegalLine />
        </div>
      </div>
    </ModalFrame>
  )
}
