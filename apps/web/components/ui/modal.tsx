'use client'

import { useEffect, useRef, type ComponentType, type ReactNode, type SVGProps } from 'react'
import { XClose } from '@untitledui/icons'

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

/** A dialog over the page. Escape and the close button call onClose. Destructive modals show the icon in the error colour. */
export function Modal({ icon: ModalIcon, title, children, actions, onClose, destructive }: { icon: Icon; title: string; children: ReactNode; actions: ReactNode; onClose: () => void; destructive?: boolean }) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('button')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-overlay/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div ref={panel} role="dialog" aria-modal aria-labelledby="modal-title" className="relative flex w-full max-w-100 flex-col gap-5 rounded-2xl bg-primary p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between">
          <span className={`flex size-10 items-center justify-center rounded-md border border-primary shadow-xs ${destructive ? 'text-fg-error' : 'text-fg-quaternary'}`}>
            <ModalIcon size={20} aria-hidden />
          </span>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-2 text-fg-quaternary hover:bg-primary_hover hover:text-fg-quaternary_hover">
            <XClose size={20} aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <h2 id="modal-title" className="text-md font-semibold text-primary">{title}</h2>
          <div className="text-sm text-tertiary">{children}</div>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">{actions}</div>
      </div>
    </div>
  )
}
