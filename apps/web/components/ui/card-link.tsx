import type { ReactNode } from 'react'
import Link from 'next/link'

/** The photo and the name of a card: a link, or a button when the card opens in place, as in the results panel. */
export function CardLink({ href, onOpen, hidden, className, children }: {
  href: string; onOpen?: () => void; hidden?: boolean; className: string; children: ReactNode
}) {
  // Keyboard and screen readers use the name, so the photo is out of the tab order.
  const a11y = hidden ? { tabIndex: -1, 'aria-hidden': true } : {}
  if (onOpen) return <button type="button" onClick={onOpen} className={`text-left ${className}`} {...a11y}>{children}</button>
  return <Link href={href} className={className} {...a11y}>{children}</Link>
}
