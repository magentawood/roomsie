import Link from 'next/link'
import type { GoLiveField, ListingResponse } from '@roomsie/contract'
import { listingSteps, missingFieldLinks } from '../../lib/listing-steps'

/** A 422 lists what a listing needs to be live (T-41). Each line links to its step. */
export function MissingNotice({ listing, missing }: { listing: Pick<ListingResponse, 'id' | 'kind'>; missing: GoLiveField[] }) {
  const steps = listingSteps(listing.kind)
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-md border border-error bg-badge-error p-3 text-sm text-error-primary">
      <p className="font-semibold">Your listing needs these to be live:</p>
      <ul className="flex flex-col gap-1">
        {missing.map((field) => (
          <li key={field}>
            <Link className="underline" href={`/listings/${listing.id}/${steps.indexOf(missingFieldLinks[field].step) + 1}`}>{missingFieldLinks[field].label}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
