import type { ReactNode } from 'react'
import { Home02, MarkerPin01 } from '@untitledui/icons'
import { listingTitle, type ListingResponse } from '@roomsie/contract'
import { rentAmount } from '../../lib/listing-steps'
import { Badge } from '../ui/badge'
import { CardLabel, CardLink } from '../ui/card-link'

/** The result card of the designs for a place. */
export function PlaceCard({ listing, areaName, action, label, onOpen }: {
  listing: ListingResponse; areaName?: string; action?: ReactNode; label?: ReactNode; onOpen?: () => void
}) {
  const href = `/places/${listing.id}`
  const photo = listing.photos[0]
  const rent = rentAmount(listing)
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-xl border border-secondary bg-primary">
      <CardLink href={href} onOpen={onOpen} decorative className="block aspect-3/2 bg-tertiary">
        {photo
          ? <img src={photo.url} alt="" className="size-full object-cover" />
          : <span className="flex size-full items-center justify-center text-fg-quaternary"><Home02 size={32} aria-hidden /></span>}
      </CardLink>
      <CardLabel>{label}</CardLabel>
      {/* 12 8 in (with the 1 px border), the title and the area 8 apart, then 12 to the price (the "Heading and subheading" of the designs). */}
      <div className="flex flex-1 flex-col gap-3 px-1.75 py-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-md font-medium text-primary"><CardLink href={href} onOpen={onOpen} className="outline-focus-ring hover:underline focus-visible:outline-2">{listingTitle(listing)}</CardLink></h3>
            {listing.verified && <Badge tone="success">Verified</Badge>}
          </div>
          {areaName && <p className="flex items-center gap-1.5 text-sm text-secondary"><MarkerPin01 size={16} aria-hidden className="shrink-0 text-fg-quaternary" />{areaName}</p>}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-dashed border-secondary pt-3">
          <p className="text-lg font-semibold text-primary">
            {rent ? <><span className="underline">{rent}</span> <span className="text-sm font-normal text-tertiary">/mo</span></> : <span className="text-sm font-normal text-tertiary">Rent not set</span>}
          </p>
          {action}
        </div>
      </div>
    </article>
  )
}
