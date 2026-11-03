'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProfile } from '../../lib/queries'
import { useTabFlag } from '../../lib/tab-flag'
import { CloseButton } from '../ui/modal'

/** A close hides the card for this visit of the browser tab, as "Explore for now" does for the create dialog. */
const hideKey = 'roomsie:hide-completion'

function Ring({ percent }: { percent: number }) {
  // A radius of 100 / 2π gives a circle of 100, so the dash is the percentage.
  return (
    <span className="relative flex size-16 shrink-0 items-center justify-center">
      <svg viewBox="0 0 36 36" aria-hidden className="absolute inset-0 -rotate-90">
        <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3" className="stroke-(--background-color-quaternary)" />
        <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3" strokeDasharray={`${percent} 100`} className="stroke-(--background-color-step-complete)" />
      </svg>
      <span className="text-sm font-medium text-primary">{percent}%</span>
    </span>
  )
}

/** "Profile Completion" of the designs: in the sidebar of a computer, and above the chat of a phone (T-48). */
export function CompletionCard({ look }: { look: 'sidebar' | 'phone' }) {
  const profile = useProfile()
  const pathname = usePathname()
  const [hidden, hide] = useTabFlag(hideKey)
  // With no profile, nothing is done. Null: the API before T-48, for the minutes of a deploy.
  const percent = profile.data === null ? 0 : profile.data?.completion
  // The profile page is where the person completes it. On a phone, the card shows on the chat only, as in the designs.
  if (percent === undefined || percent === null || percent === 100 || hidden || pathname === '/profile' || (look === 'phone' && pathname !== '/chat')) return null
  const close = <CloseButton onClose={hide} />
  const body = (
    <span className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-primary">Profile Completion</span>
      <span className="text-sm text-tertiary">Add the details that are missing from your profile.</span>
    </span>
  )
  const update = <Link href="/profile" className="w-fit rounded-sm text-sm font-semibold text-secondary outline-focus-ring hover:text-secondary_hover focus-visible:outline-2">Update Profile</Link>
  if (look === 'sidebar') {
    return (
      <section aria-label="Profile completion" className="relative flex flex-col gap-4 rounded-xl bg-secondary p-4">
        <span className="absolute top-2 right-2">{close}</span>
        <Ring percent={percent} />
        {body}
        {update}
      </section>
    )
  }
  return (
    // Above the chat, not over it, so it never hides the first lines of a short chat.
    <section aria-label="Profile completion" className="mx-4 mt-4 flex shrink-0 items-start gap-4 rounded-xl border border-secondary bg-primary p-4 shadow-lg lg:hidden">
      <Ring percent={percent} />
      <span className="flex flex-1 flex-col gap-3">{body}{update}</span>
      <span className="-mt-2 -mr-2">{close}</span>
    </section>
  )
}
