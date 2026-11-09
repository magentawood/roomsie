'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { XClose } from '@untitledui/icons'
import type { Icon } from './button'

/** Where a modal sits at each width. The phone modals of the designs are cards in the middle, 16 px from the sides. */
const places = {
  /** A card of 400 px. */
  middle: 'inset-x-4 my-auto max-w-100 rounded-2xl',
  /** A card of 480 px: the report, "I found a place". */
  wide: 'inset-x-4 my-auto max-w-120 rounded-2xl',
  /** A card of 580 px: the feedback pop-up (T-50). */
  wider: 'inset-x-4 my-auto max-w-145 rounded-2xl',
  /** A full-width sheet at the bottom of a phone, and a card of 480 px from the `lg` width: the sign-in wall. */
  sheet: 'inset-x-0 mb-0 max-w-none rounded-t-2xl lg:inset-x-4 lg:my-auto lg:max-w-120 lg:rounded-2xl',
}
export type ModalPlace = keyof typeof places

/** The frame of each modal: the native dialog, its backdrop and the close on a backdrop click. */
export function ModalFrame({ labelledBy, onClose, place = 'middle', children }: { labelledBy: string; onClose: () => void; place?: ModalPlace; children: ReactNode }) {
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

/**
 * A success icon is for an offer, as "Verify your ID". `titleId` names the dialog. The close sits 12 px from the corner of a
 * phone modal, 16 px from lg. With no icon and no art, as the report of the designs, the title keeps clear of the close.
 */
export function ModalHead({ icon: ModalIcon, art, iconTone = 'error', titleId, title, children, onClose }: {
  iconTone?: keyof typeof tones; titleId: string; title: string; children: ReactNode; onClose: () => void
} & ({ icon?: Icon; art?: never } | { art: string; icon?: never })) {
  return (
    <div className="flex flex-col gap-4">
      {ModalIcon ? (
        <span className={`flex size-10 items-center justify-center self-start rounded-md border border-primary shadow-xs ${tones[iconTone]}`}>
          <ModalIcon size={20} aria-hidden />
        </span>
      ) : art && <img src={art} alt="" className="size-20.5 self-start lg:size-29" />}
      <span className="absolute top-3 right-3 lg:top-4 lg:right-4"><CloseButton onClose={onClose} /></span>
      <div className={`flex flex-col gap-0.5 ${ModalIcon || art ? '' : 'pr-10'}`}>
        <h2 id={titleId} className="text-md font-semibold text-primary">{title}</h2>
        <div className="text-sm text-tertiary">{children}</div>
      </div>
    </div>
  )
}

/** A modal with an icon, a title, a text and the actions: a confirmation. Padding 24, and 32 above the actions, as the designs. */
export function Modal({ icon, iconTone, title, children, actions, place, onClose }: {
  icon?: Icon; iconTone?: keyof typeof tones; title: string; children: ReactNode; actions: ReactNode; place?: ModalPlace; onClose: () => void
}) {
  return (
    <ModalFrame labelledBy="modal-title" onClose={onClose} place={place}>
      <div className="flex flex-col gap-5 p-6">
        <ModalHead icon={icon} iconTone={iconTone} titleId="modal-title" title={title} onClose={onClose}>{children}</ModalHead>
        <div className="mt-3 flex gap-3">{actions}</div>
      </div>
    </ModalFrame>
  )
}
