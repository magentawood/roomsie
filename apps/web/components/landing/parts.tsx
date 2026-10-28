import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowNarrowRight } from '@untitledui/icons'

/** One width for each section of the landing page: phone, then tablet (md), then desktop (xl). */
export function Container({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`relative mx-auto w-full max-w-360 px-5 md:px-6 xl:px-16 ${className}`}>{children}</div>
}

export function SectionHeading({ className = '', children }: { className?: string; children: ReactNode }) {
  return <h2 className={`text-display-xs font-medium md:text-display-md xl:text-display-lg ${className}`}>{children}</h2>
}

/** "Start looking" opens the chat. `light` is the white button of the dark section. */
export function StartLooking({ light }: { light?: boolean }) {
  return (
    <Link href="/chat" className={`inline-flex items-center gap-3 rounded-full py-1.5 pr-1.5 pl-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 md:py-2 md:pr-2 md:text-lg xl:gap-4 xl:pl-6 xl:text-display-xs ${
      light ? 'bg-primary text-primary outline-focus-ring_on-dark hover:bg-tertiary' : 'bg-primary-solid text-primary_on-dark outline-focus-ring hover:bg-brand-solid_hover'}`}>
      <span className="px-0.5">Start looking</span>
      <span className={`flex size-8 items-center justify-center rounded-full text-primary md:size-10 xl:size-13.5 ${light ? 'bg-arrow-glow' : 'bg-primary'}`}>
        <ArrowNarrowRight size={20} aria-hidden className="size-3.5 xl:size-5" />
      </span>
    </Link>
  )
}

export function Mascot({ name, className }: { name: 'sunglasses' | 'confused' | 'angry' | 'celebrating' | 'laptop'; className: string }) {
  return <img src={`/landing/mascot-${name}.webp`} alt="" className={`pointer-events-none absolute object-contain ${className}`} />
}
