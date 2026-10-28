import Link from 'next/link'
import { ArrowUpRight } from '@untitledui/icons'
import type { SiteDetails } from '@roomsie/contract'
import { Logo } from '../shell/logo'
import { FeedbackCard } from './feedback-card'
import { Container, Mascot, SectionHeading, StartLooking } from './parts'

const socials = [
  { key: 'instagram', name: 'Instagram' },
  { key: 'whatsapp', name: 'WhatsApp' },
  { key: 'facebook', name: 'Facebook' },
  { key: 'linkedin', name: 'LinkedIn' },
] as const

const card = 'flex flex-col rounded-2xl border border-primary bg-primary p-5 md:p-6'
const cardTitle = 'text-lg font-medium text-secondary md:text-xl md:text-primary'

export function Callout() {
  return (
    <section className="bg-primary-solid">
      <Container className="flex flex-col gap-6.5 py-14 md:gap-12 md:py-12 xl:py-20">
        <SectionHeading className="max-w-87.5 text-primary_on-dark md:max-w-183 xl:max-w-224">Your next flat is just one search away</SectionHeading>
        <span><StartLooking light /></span>
        <Mascot name="laptop" className="top-26.5 right-6.75 size-26 md:top-1/2 md:right-13.25 md:size-35 md:-translate-y-1/2 xl:top-20.25 xl:right-16 xl:size-62 xl:translate-y-0" />
      </Container>
    </section>
  )
}

/** "Follow us" and "Contact us" show only with the details that a moderator set (T-23a). */
export function Contact({ details }: { details: SiteDetails }) {
  const links = socials.flatMap((s) => (details[s.key] ? [{ ...s, href: details[s.key]! }] : []))
  return (
    <section className="bg-primary-solid">
      <Container className="flex flex-col gap-6 pt-14 pb-7 md:gap-16 md:pt-12 md:pb-6 xl:pt-24 xl:pb-0">
        <div className="flex flex-col gap-2 text-primary_on-dark">
          <SectionHeading>Contact us or Give us your feedback</SectionHeading>
          <p className="text-md md:font-medium xl:text-xl xl:font-normal">We’re still new, help us with your valuable words</p>
        </div>
        <div className="flex flex-col gap-6 md:grid md:grid-cols-2 xl:items-end xl:gap-11.75">
          <FeedbackCard className={`${card} gap-4 shadow-glow xl:gap-4.5`} />
          {(links.length > 0 || details.contactEmail) && (
            <div className="flex flex-col gap-6 xl:gap-9.25">
              {links.length > 0 && (
                <div className={`${card} gap-3.5 md:flex-1 md:shadow-glow xl:gap-4.5`}>
                  <h3 className={cardTitle}>Follow us</h3>
                  <ul className="flex flex-wrap gap-4.5 p-2.5">
                    {links.map((link) => (
                      <li key={link.key}>
                        <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`Roomsie on ${link.name}`}
                          className="flex size-10.5 items-center justify-center rounded-xl border border-secondary p-2 outline-focus-ring hover:bg-primary_hover focus-visible:outline-2">
                          <img src={`/landing/icons/${link.key}.svg`} alt="" width={24} height={24} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {details.contactEmail && (
                <div className={`${card} gap-3 md:flex-1 md:shadow-glow xl:gap-4.5`}>
                  <h3 className={cardTitle}>Contact us</h3>
                  <a href={`mailto:${details.contactEmail}`} className="flex w-fit items-center gap-2 rounded-md text-sm text-secondary outline-focus-ring hover:underline focus-visible:outline-2 md:text-xl md:text-tertiary">
                    {details.contactEmail}
                    <ArrowUpRight size={32} aria-hidden className="size-4 text-primary md:size-8" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
        <Logo className="hidden h-auto w-full text-primary_on-dark md:block xl:mt-6.5" />
      </Container>
    </section>
  )
}

const legal = [
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms of use' },
  { href: '/grievance', label: 'Grievance officer' },
]

/** No headquarters. The organisation number shows when a moderator sets it (T-23a). */
export function Footer({ orgNumber }: { orgNumber: string | null }) {
  return (
    <footer className="bg-primary-solid text-primary_on-dark">
      <Container className="flex flex-col items-center gap-9.5 pt-13 pb-7 text-center md:flex-row-reverse md:justify-between md:gap-6 md:py-6 md:text-left xl:px-24">
        <Logo className="h-auto w-full max-w-85.5 md:hidden" />
        <nav aria-label="Legal">
          <ul className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-sm font-medium">
            {legal.map((link, i) => (
              <li key={link.href} className="flex gap-2">
                {i > 0 && <span aria-hidden className="text-tertiary_on-dark">·</span>}
                <Link href={link.href} className="rounded-sm outline-focus-ring_on-dark hover:underline focus-visible:outline-2">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-xs md:text-sm">
          Copyright © 2026 Roomsie. All rights reserved.{orgNumber && ` Organization number: ${orgNumber}`}
        </p>
      </Container>
    </footer>
  )
}
