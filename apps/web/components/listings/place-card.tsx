import type { ReactNode } from 'react'
import { Calendar, Home02, MarkerPin01 } from '@untitledui/icons'
import type { ListingResponse } from '@roomsie/contract'
import { availableLabel, listingTitle, rentAmount, rulesLine } from '../../lib/listing-steps'

/**
 * The result card of the designs for a place. Saved shows it now (T-47); T-15 can show it in the results,
 * and T-43 makes it open the detail. The "Verified" badge waits for T-46.
 */
export function PlaceCard({ listing, areaName, action }: { listing: ListingResponse; areaName?: string; action?: ReactNode }) {
  const photo = listing.photos[0]
  const faces = listing.flatmates.flatMap((f) => (f.photoUrl ? [f.photoUrl] : [])).slice(0, 3)
  const rules = rulesLine(listing)
  const rent = rentAmount(listing)
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-secondary bg-primary">
      <div className="relative aspect-3/2 bg-tertiary">
        {photo
          ? <img src={photo.url} alt="" className="size-full object-cover" />
          : <span className="flex size-full items-center justify-center text-fg-quaternary"><Home02 size={32} aria-hidden /></span>}
        {faces.length > 0 && (
          <span className="absolute bottom-2 left-2 flex -space-x-2">
            {faces.map((url) => <img key={url} src={url} alt="" className="size-9 rounded-full border-2 border-on-photo object-cover" />)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-md font-medium text-primary">{listingTitle(listing)}</h3>
          {action}
        </div>
        {areaName && <p className="flex items-center gap-1.5 text-sm text-secondary"><MarkerPin01 size={16} aria-hidden className="shrink-0 text-fg-quaternary" />{areaName}</p>}
        {listing.availableFrom && (
          <p className="flex items-center gap-1.5 text-sm text-secondary">
            <Calendar size={16} aria-hidden className="shrink-0 text-fg-quaternary" />Available from: {availableLabel(listing.availableFrom)}
          </p>
        )}
        {rules && <p className="text-sm text-tertiary">{rules}</p>}
        <p className="mt-auto border-t border-dashed border-secondary pt-2 text-lg font-semibold text-primary">
          {rent ? <><span className="underline">{rent}</span> <span className="text-sm font-normal text-tertiary">/mo</span></> : <span className="text-sm font-normal text-tertiary">Rent not set</span>}
        </p>
      </div>
    </article>
  )
}
