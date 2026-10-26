import type { ReactNode } from 'react'
import Link from 'next/link'
import { Home02, MarkerPin01 } from '@untitledui/icons'
import type { ListingResponse } from '@roomsie/contract'
import { listingTitle, rentAmount } from '../../lib/listing-steps'

/** The result card of the designs for a place. TODO(T-46): the "Verified" badge. */
export function PlaceCard({ listing, areaName, action }: { listing: ListingResponse; areaName?: string; action?: ReactNode }) {
  const href = `/places/${listing.id}`
  const photo = listing.photos[0]
  const rent = rentAmount(listing)
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-secondary bg-primary">
      {/* The photo opens the detail too. The title link is the one that a keyboard and a screen reader get. */}
      <Link href={href} tabIndex={-1} aria-hidden className="block aspect-3/2 bg-tertiary">
        {photo
          ? <img src={photo.url} alt="" className="size-full object-cover" />
          : <span className="flex size-full items-center justify-center text-fg-quaternary"><Home02 size={32} aria-hidden /></span>}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="text-md font-medium text-primary"><Link href={href} className="outline-focus-ring hover:underline focus-visible:outline-2">{listingTitle(listing)}</Link></h3>
        {areaName && <p className="flex items-center gap-1.5 text-sm text-secondary"><MarkerPin01 size={16} aria-hidden className="shrink-0 text-fg-quaternary" />{areaName}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-dashed border-secondary pt-2">
          <p className="text-lg font-semibold text-primary">
            {rent ? <><span className="underline">{rent}</span> <span className="text-sm font-normal text-tertiary">/mo</span></> : <span className="text-sm font-normal text-tertiary">Rent not set</span>}
          </p>
          {action}
        </div>
      </div>
    </article>
  )
}
