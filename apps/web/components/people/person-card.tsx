import type { ReactNode } from 'react'
import type { CardResponse } from '@roomsie/contract'
import { personFacts, personTags } from '../../lib/cards'
import { initials } from '../../lib/person'
import { Badge } from '../ui/badge'
import { cardBox, CardLabel, CardLink, overCard } from '../ui/card-link'
import { DotLine, Facts, TagLine } from '../ui/card-lines'
import { PhotoStrip } from '../ui/photo-strip'

/**
 * The card of a person, as the frame "All types of cards and listings" (67:6750): the name and its pill, the job and the age,
 * what they look for, the budget, the date, the lifestyle tags and the bio. `selected`: the card is in "Listings selected".
 */
export function PersonCard({ card, action, label, selected, onOpen }: { card: CardResponse; action?: ReactNode; label?: ReactNode; selected?: boolean; onOpen?: () => void }) {
  const href = `/people/${card.id}`
  const about = [card.jobRole, card.age && `${card.age} yrs`].filter((v): v is string => Boolean(v))
  const tags = personTags(card)
  return (
    <article className={cardBox(selected)}>
      {/* Above the link of the whole card, so a swipe moves the photos. A computer shows no dots on a person (State=Hover of 67:6750). */}
      <div className={`h-46 shrink-0 overflow-hidden rounded-xl bg-secondary ${overCard}`}>
        {card.photos.length
          ? <PhotoStrip urls={card.photos.map((p) => p.url)} href={href} onOpen={onOpen} dots="phone" selected={selected} />
          : (
            <CardLink href={href} onOpen={onOpen} decorative className="flex size-full items-center justify-center">
              <span className="flex size-20 items-center justify-center rounded-full bg-tertiary text-xl font-semibold text-tertiary">{initials(card.fullName)}</span>
            </CardLink>
          )}
      </div>
      <CardLabel>{label}</CardLabel>
      <div className="flex flex-1 flex-col gap-3 px-2 py-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1.5">
              <h3 className="text-md font-semibold text-primary"><CardLink href={href} onOpen={onOpen} stretched className="outline-focus-ring group-hover/card:underline focus-visible:outline-2">{card.fullName}</CardLink></h3>
              {about.length > 0 && <DotLine items={about} className="text-xs font-medium text-secondary" />}
            </div>
            {(card.verified || card.managedByParent) && (
              <div className="flex shrink-0 flex-col items-end gap-1">
                {card.verified && <Badge tone="success" verified>Verified</Badge>}
                {card.managedByParent && <Badge tone="gray" dot={false}>Managed by a parent</Badge>}
              </div>
            )}
          </div>
          <Facts facts={personFacts(card)} />
          {tags && <TagLine tags={tags} />}
        </div>
        {/* The "Quote" of the designs: 4 px in, on the grey of the page. */}
        {card.bio && <p className="line-clamp-3 bg-secondary p-1 text-xs font-medium text-tertiary">“{card.bio}”</p>}
        {action && <div className="mt-auto flex justify-end border-t border-dashed border-primary pt-2"><span className={overCard}>{action}</span></div>}
      </div>
    </article>
  )
}
