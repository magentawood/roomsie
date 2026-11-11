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

/**
 * The box of a place or person card: no stroke, and the large shadow under the pointer or when the card is selected
 * (State=Hover and State=Selected of 67:6750).
 */
export const cardBox = (selected?: boolean) =>
  `group/card relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl bg-primary transition-shadow hover:shadow-lg ${selected ? 'shadow-lg' : ''}`

/** The Select tag and the match label on the photo: 10 px in on a phone, 8 px on a computer (the Tag of 67:6750). */
export function CardLabel({ children }: { children?: ReactNode }) {
  return children ? <div className="absolute top-2.5 left-2.5 z-10 lg:top-2 lg:left-2">{children}</div> : null
}
