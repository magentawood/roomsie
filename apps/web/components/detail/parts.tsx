'use client'

import { useState } from 'react'
import { DotsVertical } from '@untitledui/icons'
import type { Icon } from '../ui/button'

/** The parts that the detail of a place and the detail of a person share (T-43, T-18b). */

export type Fact = { label: string; value: string; icon: Icon }

export function Facts({ lines }: { lines: Fact[] }) {
  return (
    <dl className="grid grid-cols-2 border-t border-secondary">
      {lines.map((l) => (
        <div key={l.label} className="flex gap-3 border-b border-secondary px-1 py-3 odd:border-r even:pl-4">
          <l.icon size={20} aria-hidden className="mt-0.5 shrink-0 text-fg-quaternary" />
          <div className="flex flex-col text-sm"><dt className="font-medium text-secondary">{l.label}</dt><dd className="text-tertiary">{l.value}</dd></div>
        </div>
      ))}
    </dl>
  )
}

export function Chips({ items, className = 'border-secondary bg-secondary text-secondary' }: { items: string[]; className?: string }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => <li key={item} className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>{item}</li>)}
    </ul>
  )
}

export function Photos({ photos, shape = 'aspect-3/2' }: { photos: { key: string; url: string }[]; shape?: string }) {
  const [shown, setShown] = useState(0)
  if (!photos.length) return null
  return (
    <div className="flex flex-col gap-2 md:flex-row">
      <img src={photos[shown]!.url} alt={`Photo ${shown + 1} of ${photos.length}`} className={`${shape} w-full rounded-xl object-cover md:min-w-0 md:flex-1`} />
      {photos.length > 1 && (
        <ul className="flex gap-2 md:w-28 md:flex-col">
          {photos.map((p, i) => (
            <li key={p.key}>
              <button type="button" aria-label={`Show photo ${i + 1}`} aria-pressed={i === shown} onClick={() => setShown(i)}
                className={`block overflow-hidden rounded-md outline-focus-ring focus-visible:outline-2 ${i === shown ? 'ring-2 ring-brand' : ''}`}>
                <img src={p.url} alt="" className="aspect-square w-16 object-cover md:aspect-4/3 md:w-full" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export type MenuItem = { label: string; icon: Icon; onClick: () => void; danger?: boolean }

/** The ⋮ menu of the phone bar of a detail. */
export function DetailMenu({ id, items }: { id: string; items: MenuItem[] }) {
  return (
    <>
      <button type="button" popoverTarget={id} aria-label="More" className="rounded-md border border-primary p-1.5 text-fg-quaternary shadow-xs outline-focus-ring focus-visible:outline-2">
        <DotsVertical size={20} aria-hidden />
      </button>
      <div id={id} popover="auto" className="fixed inset-auto top-14 right-4 m-0 w-52 rounded-md border border-secondary bg-primary p-1 shadow-xl">
        {items.map((item) => (
          <button key={item.label} type="button" popoverTarget={id} popoverTargetAction="hide" onClick={item.onClick}
            className={`flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-sm font-medium hover:bg-primary_hover ${item.danger ? 'text-error-primary' : 'text-secondary'}`}>
            <item.icon size={16} aria-hidden className={item.danger ? 'text-fg-error' : 'text-fg-quaternary'} />{item.label}
          </button>
        ))}
      </div>
    </>
  )
}

/** The share sheet of the phone, or a copied link where the browser has none. A closed share sheet rejects, and that is no error. */
export function useShare(title: string) {
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const url = window.location.href
    if (navigator.share) return navigator.share({ title, url }).catch(() => undefined)
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return { share, copied }
}
