'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { XClose } from '@untitledui/icons'
import type { Icon } from './button'

/** The frame of each modal: the native dialog, its backdrop and the close on a backdrop click. */
export function ModalFrame({ labelledBy, onClose, children }: { labelledBy: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => dialog.current?.showModal(), [])
  return (
    // A click on the backdrop has the dialog as its target. A click in the panel has a child as its target.
    <dialog ref={dialog} aria-labelledby={labelledBy} onClose={onClose} onClick={(e) => e.target === e.currentTarget && onClose()}
      className="inset-x-4 mx-auto mt-auto mb-4 w-auto max-w-100 rounded-2xl bg-primary shadow-xl backdrop:bg-overlay/70 backdrop:backdrop-blur-sm sm:my-auto">
      {children}
    </dialog>
  )
}

/** A success icon is for an offer, as "Verify your ID". `titleId` names the dialog. */
export function ModalHead({ icon: ModalIcon, iconTone = 'error', titleId, title, children, onClose }: {
  icon: Icon; iconTone?: 'error' | 'success'; titleId: string; title: string; children: ReactNode; onClose: () => void
}) {
  return (
    <>
      <div className="flex items-start justify-between">
        <span className={`flex size-10 items-center justify-center rounded-md border border-primary shadow-xs ${iconTone === 'error' ? 'text-fg-error' : 'text-fg-success'}`}>
          <ModalIcon size={20} aria-hidden />
        </span>
        <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-2 text-fg-quaternary outline-focus-ring hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2">
          <XClose size={20} aria-hidden />
        </button>
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
  icon: Icon; iconTone?: 'error' | 'success'; title: string; children: ReactNode; actions: ReactNode; onClose: () => void
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
