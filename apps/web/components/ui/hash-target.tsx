'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * A part of a page that a link opens with its hash, as `/profile#commute` from the commute tip of the chat. The page loads its data
 * first, so the part scrolls itself into view when it shows, and its first field takes the focus.
 */
export function HashTarget({ id, children }: { id: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (location.hash !== `#${id}`) return
    box.current?.scrollIntoView({ block: 'center' })
    box.current?.querySelector<HTMLElement>('input, textarea, select')?.focus({ preventScroll: true })
  }, [id])
  return <div id={id} ref={box}>{children}</div>
}
