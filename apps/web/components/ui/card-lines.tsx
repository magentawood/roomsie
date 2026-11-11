import { Fragment } from 'react'
import { Calendar, Disc01, MarkerPin03, SearchSm, User02, User03, Users02, Wallet03 } from '@untitledui/icons'
import type { Fact, FactIcon, Tags } from '../../lib/cards'
import type { Icon } from './button'

/** The icons of the lines of a card, as the designs draw them (67:6750). */
const factIcons: Record<FactIcon, Icon> = {
  area: MarkerPin03, people: User03, date: Calendar, type: User02, sharing: Users02, meals: Disc01, looking: SearchSm, budget: Wallet03,
}

/** The dot between two values of a line: 4 px, in the colour of the icons. */
export const Dot = () => <span aria-hidden className="size-1 shrink-0 rounded-full bg-current text-fg-tertiary" />

/** The lines with an icon: 16 px icons, 12 px text, 6 px apart. A label is grey, and its value is dark, as the designs. */
export function Facts({ facts }: { facts: Fact[] }) {
  if (!facts.length) return null
  return (
    <ul className="flex flex-col gap-1.5 text-xs font-medium">
      {facts.map(({ icon, label, value }) => {
        const FactIcon = factIcons[icon]
        return (
          <li key={icon} className="flex min-w-0 items-center gap-1">
            {/* The icons of the designs have a 1.5 px stroke at 16 px. */}
            <FactIcon size={16} strokeWidth={2.25} aria-hidden className="shrink-0 text-fg-tertiary" />
            {label && <span className="shrink-0 text-tertiary">{label}</span>}
            <span className="truncate text-primary">{value}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** Values with a dot between them, as "Business analyst • 26 yrs". */
export function DotLine({ items, className }: { items: string[]; className: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-1.5 ${className}`}>
      {items.map((item, i) => <li key={item} className="flex items-center gap-1.5">{i > 0 && <Dot />}{item}</li>)}
    </ul>
  )
}

/**
 * "No smoking • Veg kitchen • Guests welcome +3": the first values of a card and the count of the rest, on one line as the designs.
 * A line too long for the card ends in "…", and the count stays.
 */
export function TagLine({ tags: { shown, more } }: { tags: Tags }) {
  return (
    <p className="flex min-w-0 gap-1 text-xs font-medium text-tertiary">
      <span className="truncate">
        {shown.map((tag, i) => (
          <Fragment key={tag}>
            {i > 0 && <><span className="sr-only">, </span><span aria-hidden className="mx-1 inline-block size-1 rounded-full bg-current align-middle text-fg-tertiary" /></>}
            {tag}
          </Fragment>
        ))}
      </span>
      {more > 0 && <span className="shrink-0"><span aria-hidden>+{more}</span><span className="sr-only">and {more} more</span></span>}
    </p>
  )
}
