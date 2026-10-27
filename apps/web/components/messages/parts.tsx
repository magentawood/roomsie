'use client'

import { InfoCircle, User01 } from '@untitledui/icons'
import type { OtherPerson } from '@roomsie/contract'
import { listerLabel } from '../../lib/place-detail'
import { listingTitle } from '../../lib/listing-steps'
import { otherName } from '../../lib/messages'
import { initials } from '../../lib/person'
import { useAreaLabels, useListing } from '../../lib/queries'

export function Avatar({ photoUrl, name, size = 'md' }: { photoUrl: string | null; name: string | null; size?: 'md' | 'sm' }) {
  const box = size === 'md' ? 'size-10' : 'size-8'
  if (photoUrl) return <img src={photoUrl} alt="" className={`${box} shrink-0 rounded-full object-cover`} />
  return (
    <span className={`flex ${box} shrink-0 items-center justify-center rounded-full border border-secondary bg-tertiary text-sm font-semibold text-tertiary`}>
      {name ? initials(name) : <User01 size={20} aria-hidden className="text-fg-quaternary" />}
    </span>
  )
}

function useListingLine(listingId: string | null) {
  const listing = useListing(listingId)
  const areas = useAreaLabels()
  if (!listing.data) return null
  const area = listing.data.areaSlug ? areas[listing.data.areaSlug] : null
  return { title: listingTitle(listing.data), line: [listerLabel(listing.data.kind), area].filter(Boolean).join(' · ') }
}

/** The name of a chat: the person, "Deleted user", or the listing when its lister has no profile. */
export function useChatName(other: OtherPerson, listingId: string | null) {
  const listing = useListingLine(listingId)
  return { name: otherName(other) ?? listing?.title ?? 'Lister', about: listing?.line ?? null }
}

export function SafetyNotice() {
  return (
    <div className="flex gap-3 rounded-xl border border-primary bg-primary p-4 shadow-xs">
      <InfoCircle size={20} aria-hidden className="shrink-0 text-fg-quaternary" />
      <div className="flex flex-col gap-1 text-sm">
        <p className="font-semibold text-secondary">Stay safe on Roomsie</p>
        <p className="text-tertiary">Meet in a public place first. Never pay a deposit or token amount before you see the place. If someone asks for money up front, report them.</p>
      </div>
    </div>
  )
}
