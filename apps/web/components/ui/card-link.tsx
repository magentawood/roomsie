import type { ReactNode } from 'react'
import Link from 'next/link'

/**
 * The photo and the name of a card: a link, or a button when the card opens in place, as in the results panel. `stretched`: the
 * link covers the whole card (its `relative` box), so a tap anywhere on the card opens it (the founders, 2026-11-10).
 */
export function CardLink({ href, onOpen, decorative, stretched, className, children }: {
  href: string; onOpen?: () => void; decorative?: boolean; stretched?: boolean; className: string; children: ReactNode
}) {
  // Keyboard and screen readers use the name, so the photo is out of the tab order.
  const a11y = decorative ? { tabIndex: -1, 'aria-hidden': true } : {}
  const classes = `${className} ${stretched ? 'after:absolute after:inset-0' : ''}`
  if (onOpen) return <button type="button" onClick={onOpen} className={`text-left ${classes}`} {...a11y}>{children}</button>
  return <Link href={href} className={classes} {...a11y}>{children}</Link>
}

/** A control on a card, as Select or Save: above the link of the whole card, so it keeps its own tap. */
export const overCard = 'relative z-10'

export function CardLabel({ children }: { children?: ReactNode }) {
  return children ? <div className="absolute top-3 left-3 z-10 lg:top-1.75 lg:left-1.75">{children}</div> : null
}
