import type { ReactNode } from 'react'
import { Home02 } from '@untitledui/icons'
import { listingTitle, type ListingResponse } from '@roomsie/contract'
import { flatmateFaces, placeBadge, placeFacts, placeTags } from '../../lib/cards'
import { rentAmount } from '../../lib/listing-steps'
import { initials } from '../../lib/person'
import { Badge } from '../ui/badge'
import { cardBox, CardLabel, CardLink, overCard } from '../ui/card-link'
import { Facts, TagLine } from '../ui/card-lines'
import { PhotoStrip } from '../ui/photo-strip'

/** The faces of the flatmates at the lower left of the photo: 40 px, 4 px over each other, with a white ring (67:6750). */
function Faces({ listing }: { listing: ListingResponse }) {
  const faces = flatmateFaces(listing)
  if (!faces.length) return null
  return (
    <span className="absolute bottom-2 left-3.25 flex">
      {faces.map((f, i) => (
        <span key={`${f.name}-${i}`} className={`flex size-10 items-center justify-center overflow-hidden rounded-full bg-tertiary text-md font-semibold text-tertiary ring-[1.5px] ring-(color:--background-color-primary) ${i ? '-ml-1' : ''}`}>
          {f.photoUrl ? <img src={f.photoUrl} alt="" className="size-full object-cover" /> : initials(f.name)}
        </span>
      ))}
    </span>
  )
}

/**
 * The card of a place, as the frame "All types of cards and listings" (67:6750): the photo with the faces of the flatmates,
 * the title and its pill, the lines of the kind, the tags, and the rent. `selected`: the card is in "Listings selected".
 */
export function PlaceCard({ listing, areaName, action, label, selected, onOpen }: {
  listing: ListingResponse; areaName?: string; action?: ReactNode; label?: ReactNode; selected?: boolean; onOpen?: () => void
}) {
  const href = `/places/${listing.id}`
  const hasFaces = flatmateFaces(listing).length > 0
  const rent = rentAmount(listing)
  const badge = placeBadge(listing)
  const tags = placeTags(listing)
  return (
    <article className={cardBox(selected)}>
      {/* Above the link of the whole card, so a swipe moves the photos. */}
      <div className={`h-46 shrink-0 overflow-hidden rounded-xl bg-tertiary ${overCard}`}>
        {listing.photos.length
          ? (
            <PhotoStrip urls={listing.photos.map((p) => p.url)} href={href} onOpen={onOpen} dots="hover" faces={hasFaces} selected={selected}>
              <Faces listing={listing} />
            </PhotoStrip>
          )
          : (
            <CardLink href={href} onOpen={onOpen} decorative className="relative flex size-full items-center justify-center text-fg-quaternary">
              <Home02 size={32} aria-hidden />
              <Faces listing={listing} />
            </CardLink>
          )}
      </div>
      <CardLabel>{label}</CardLabel>
      {/* 12 8 in. The title, the lines and the tags 8 apart, then 12 to the line and 12 to the rent ("Content" of 67:6750). */}
      <div className="flex flex-1 flex-col gap-3 px-2 py-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <h3 className="min-w-0 text-md font-semibold text-primary"><CardLink href={href} onOpen={onOpen} stretched className="outline-focus-ring group-hover/card:underline focus-visible:outline-2">{listingTitle(listing)}</CardLink></h3>
            {badge && <span className="shrink-0"><Badge tone={badge.tone} verified={badge.verified} dot={false}>{badge.label}</Badge></span>}
          </div>
          <Facts facts={placeFacts(listing, areaName)} />
          {tags && <TagLine tags={tags} />}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-dashed border-primary pt-2.75">
          <p className="text-md font-semibold text-primary">
            {rent ? <><span className="underline">{rent}</span> <span className="text-tertiary">/mo</span></> : <span className="text-sm font-normal text-tertiary">Rent not set</span>}
          </p>
          {action && <span className={overCard}>{action}</span>}
        </div>
      </div>
    </article>
  )
}
