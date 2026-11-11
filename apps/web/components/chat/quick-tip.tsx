'use client'

import Link from 'next/link'
import { InfoCircle } from '@untitledui/icons'
import { commuteHref, commuteTip, commuteTipShows } from '../../lib/chat'
import { useProfile } from '../../lib/queries'
import { CloseButton } from '../ui/modal'

type TipState = Parameters<typeof commuteTipShows>[0]

/**
 * The "Quick tip" of flow 02. On a computer it sits above the chat input (Alert 94:22712). On a phone it sits under the goal header
 * (148:33237). A tap opens the commute field of the profile, and the X hides the tip. Only for a signed-in person: it reads the profile.
 */
export function CommuteTip({ look, state, onClose }: { look: 'computer' | 'phone'; state: TipState; onClose: () => void }) {
  const profile = useProfile()
  if (!commuteTipShows(state, profile.data)) return null
  // The link covers the box, and the X sits above it.
  const cover = 'outline-focus-ring after:absolute after:inset-0 focus-visible:outline-2'
  if (look === 'phone') {
    return (
      <aside aria-label="Quick tip" className="relative border-b border-primary bg-primary px-4 pt-3 pb-3.75 hover:bg-primary_hover lg:hidden">
        <Link href={commuteHref} className={`flex flex-col gap-0.5 pr-8 text-sm ${cover}`}>
          <span className="font-semibold text-primary">{commuteTip.title}</span>
          <span className="text-tertiary">{commuteTip.text}</span>
        </Link>
        <span className="absolute top-1 right-2 z-10"><CloseButton onClose={onClose} /></span>
      </aside>
    )
  }
  return (
    <div className="mb-2 max-lg:hidden">
      <aside aria-label="Quick tip" className="relative flex items-center gap-4 rounded-xl border border-primary bg-primary px-3.75 py-2.75 shadow-xs hover:bg-primary_hover">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-quaternary text-primary"><InfoCircle size={20} aria-hidden /></span>
        <Link href={commuteHref} className={`flex-1 pr-8 text-sm font-semibold text-secondary after:rounded-xl ${cover}`}>Quick tip: {commuteTip.text}</Link>
        <span className="absolute top-1.75 right-1.75 z-10"><CloseButton onClose={onClose} /></span>
      </aside>
    </div>
  )
}
