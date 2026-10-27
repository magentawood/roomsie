import type { ReactNode } from 'react'
import Link from 'next/link'
import { Calendar, SearchMd, Wallet02 } from '@untitledui/icons'
import type { CardResponse } from '@roomsie/contract'
import { aboutLine, budgetLine, initials, lifestyleSummary, lookingFor } from '../../lib/person'
import { shortDate } from '../../lib/place-detail'
import { Badge } from '../ui/badge'

/** The person card of sections 14 and 19 of the drafts, with no match details (T-18b). TODO(T-15): the match badges. */
export function PersonCard({ card, action }: { card: CardResponse; action?: ReactNode }) {
  const href = `/people/${card.id}`
  const photo = card.photos[0]
  const facts = [
    [SearchMd, lookingFor(card) && `Looking for: ${lookingFor(card)}`],
    [Wallet02, budgetLine(card)],
    [Calendar, card.moveDate && `Available from: ${shortDate(card.moveDate)}`],
  ] as const
  const lifestyle = lifestyleSummary(card)
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-secondary bg-primary">
      {/* Keyboard and screen readers use the name link. */}
      <Link href={href} tabIndex={-1} aria-hidden className="flex aspect-3/2 items-center justify-center bg-secondary">
        {photo
          ? <img src={photo.url} alt="" className="size-full object-cover" />
          : <span className="flex size-20 items-center justify-center rounded-full bg-tertiary text-xl font-semibold text-tertiary">{initials(card.fullName)}</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-md font-medium text-primary"><Link href={href} className="outline-focus-ring hover:underline focus-visible:outline-2">{card.fullName}</Link></h3>
          {card.verified && <Badge tone="success">Verified</Badge>}
          {card.managedByParent && <Badge tone="gray" dot={false}>Managed by a parent</Badge>}
        </div>
        <p className="text-sm text-tertiary">{aboutLine(card)}</p>
        <ul className="flex flex-col gap-1 text-sm text-secondary">
          {facts.map(([FactIcon, text]) => text && <li key={text} className="flex items-center gap-2"><FactIcon size={16} aria-hidden className="shrink-0 text-fg-quaternary" />{text}</li>)}
        </ul>
        {lifestyle && <p className="text-sm text-tertiary">{lifestyle}</p>}
        {card.bio && <p className="line-clamp-3 rounded-md bg-secondary p-2 text-sm text-tertiary">“{card.bio}”</p>}
        {action && <div className="mt-auto flex justify-end border-t border-dashed border-secondary pt-2">{action}</div>}
      </div>
    </article>
  )
}
