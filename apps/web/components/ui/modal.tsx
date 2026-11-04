'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { XClose } from '@untitledui/icons'
import type { Icon } from './button'

/** Where a modal sits at each width. */
const places = {
  /** A card at the bottom of a phone, and in the middle from the `sm` width. */
  bottom: 'inset-x-4 mb-4 max-w-100 rounded-2xl sm:my-auto',
  /** A full-width sheet at the bottom, and a card in the middle from the `lg` width. */
  sheet: 'inset-x-0 mb-0 max-w-none rounded-t-2xl lg:inset-x-4 lg:my-auto lg:max-w-120 lg:rounded-2xl',
  /** The sheet, with the width of the feedback pop-up from the `lg` width (T-50). */
  wideSheet: 'inset-x-0 mb-0 max-w-none rounded-t-2xl lg:inset-x-4 lg:my-auto lg:max-w-145 lg:rounded-2xl',
  /** A card in the middle at each width. */
  middle: 'inset-x-4 my-auto max-w-100 rounded-2xl',
}

/** The frame of each modal: the native dialog, its backdrop and the close on a backdrop click. */
export function ModalFrame({ labelledBy, onClose, place = 'bottom', children }: { labelledBy: string; onClose: () => void; place?: keyof typeof places; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => dialog.current?.showModal(), [])
  return (
    // A click on the backdrop has the dialog as its target. A click in the panel has a child as its target.
    <dialog ref={dialog} aria-labelledby={labelledBy} onClose={onClose} onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`mx-auto mt-auto w-auto bg-primary shadow-xl backdrop:bg-overlay/70 backdrop:backdrop-blur-sm ${places[place]}`}>
      {children}
    </dialog>
  )
}

export function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-2 text-fg-quaternary outline-focus-ring hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2">
      <XClose size={20} aria-hidden />
    </button>
  )
}

const tones = { error: 'text-fg-error', success: 'text-fg-success', neutral: 'text-fg-quaternary' }

/** A success icon is for an offer, as "Verify your ID". `art`: a picture in place of the icon (T-50). `titleId` names the dialog. */
export function ModalHead({ icon: ModalIcon, art, iconTone = 'error', titleId, title, children, onClose }: {
  iconTone?: keyof typeof tones; titleId: string; title: string; children: ReactNode; onClose: () => void
} & ({ icon: Icon; art?: never } | { art: string; icon?: never })) {
  return (
    <>
      <div className="flex items-start justify-between">
        {ModalIcon ? (
          <span className={`flex size-10 items-center justify-center rounded-md border border-primary shadow-xs ${tones[iconTone]}`}>
            <ModalIcon size={20} aria-hidden />
          </span>
        ) : <img src={art} alt="" className="size-29" />}
        <CloseButton onClose={onClose} />
      </div>
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="text-md font-semibold text-primary">{title}</h2>
        <div className="text-sm text-tertiary">{children}</div>
      </div>
    </>
  )
}

/** A modal with an icon, a title, a text and the actions: a confirmation. */
export function Modal({ icon, iconTone, title, children, actions, onClose }: {
  icon: Icon; iconTone?: keyof typeof tones; title: string; children: ReactNode; actions: ReactNode; onClose: () => void
}) {
  return (
    <ModalFrame labelledBy="modal-title" onClose={onClose}>
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <ModalHead icon={icon} iconTone={iconTone} titleId="modal-title" title={title} onClose={onClose}>{children}</ModalHead>
        <div className="flex gap-3">{actions}</div>
      </div>
    </ModalFrame>
  )
}
