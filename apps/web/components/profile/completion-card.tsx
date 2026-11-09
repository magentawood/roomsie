'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProfile } from '../../lib/queries'
import { CloseButton } from '../ui/modal'

function Ring({ percent }: { percent: number }) {
  return (
    <span className="relative flex size-16 shrink-0 items-center justify-center">
      <svg viewBox="0 0 36 36" aria-hidden className="absolute inset-0 -rotate-90">
        <circle cx="18" cy="18" r="16" pathLength={100} fill="none" strokeWidth="3" className="stroke-(--background-color-quaternary)" />
        <circle cx="18" cy="18" r="16" pathLength={100} fill="none" strokeWidth="3" strokeDasharray={`${percent} 100`} className="stroke-(--background-color-step-complete)" />
      </svg>
      <span className="text-sm font-medium text-primary">{percent}%</span>
    </span>
  )
}

/** "Profile Completion" of the designs: in the sidebar of a computer, and above the chat of a phone (T-48). */
export function CompletionCard({ look, onClose }: { look: 'sidebar' | 'phone'; onClose: () => void }) {
  const profile = useProfile()
  const pathname = usePathname()
  // With no profile, nothing is done. Null: the API before T-48, for the minutes of a deploy.
  const percent = profile.data === null ? 0 : profile.data?.completion
  // The profile page is where the person completes it. On a phone, the card shows on the chat only, as in the designs.
  if (percent == null || percent === 100 || pathname === '/profile' || (look === 'phone' && pathname !== '/chat')) return null
  const close = <CloseButton onClose={onClose} />
  const body = (
    <span className="flex flex-col gap-0.5 lg:gap-1">
      <span className="text-sm font-semibold text-primary">Profile Completion</span>
      <span className="text-sm text-tertiary">Add the details that are missing from your profile.</span>
    </span>
  )
  const update = <Link href="/profile" className="w-fit rounded-sm text-sm font-semibold text-secondary outline-focus-ring hover:text-secondary_hover focus-visible:outline-2">Update Profile</Link>
  if (look === 'sidebar') {
    return (
      <section aria-label="Profile completion" className="relative flex flex-col gap-4 rounded-xl bg-secondary p-4">
        <span className="absolute top-1 right-1">{close}</span>
        {/* The ring and the text are 12 apart, then 16 to "Update Profile". */}
        <span className="flex flex-col gap-3"><Ring percent={percent} />{body}</span>
        {update}
      </section>
    )
  }
  return (
    // A band above the chat, not over it, so it never hides the first lines of a short chat (146:28386). It has no
    // "Update Profile" line: its text opens the profile.
    <section aria-label="Profile completion" className="relative flex shrink-0 items-start gap-4 border-b border-secondary bg-primary p-4 pb-3.75 lg:hidden">
      <Ring percent={percent} />
      <Link href="/profile" className="min-w-0 flex-1 rounded-sm pr-8 outline-focus-ring focus-visible:outline-2">{body}</Link>
      <span className="absolute top-2 right-2">{close}</span>
    </section>
  )
}
