'use client'

import { CloseButton, ModalFrame } from '../ui/modal'
import { GoogleSignIn, LegalLine } from './google-sign-in'

/** The wall of drafts section 17: "Sign in to continue" with the text of D-02, or the copy of the turn cap (T-21). */
export function SignInWall({ title = 'Sign in to continue', text = 'Unlimited chats and multiple goals, all synced up with your account.', onClose }: {
  title?: string; text?: string; onClose: () => void
}) {
  return (
    <ModalFrame labelledBy="sign-in-wall-title" onClose={onClose} place="sheet">
      {/* Drafts section 17: on a phone the handle sits 8 from the top and the title 40, the close 32 from the top and 16 from the right. */}
      <div className="flex flex-col gap-13 p-6">
        <div className="flex flex-col gap-7">
          <span aria-hidden className="mx-auto -mt-4 h-1 w-9 rounded-full bg-quaternary lg:hidden" />
          <div className="flex flex-col gap-0.5 pr-10">
            <h2 id="sign-in-wall-title" className="text-lg font-semibold text-primary">{title}</h2>
            <p className="text-sm text-tertiary">{text}</p>
          </div>
          <span className="absolute top-8 right-4 lg:top-4"><CloseButton onClose={onClose} /></span>
        </div>
        <div className="flex flex-col gap-3">
          <GoogleSignIn size="lg" />
          <LegalLine />
        </div>
      </div>
    </ModalFrame>
  )
}
