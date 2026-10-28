import type { CSSProperties } from 'react'
import type { Quote } from '@roomsie/contract'
import { Container, Mascot, SectionHeading } from './parts'

/**
 * The places of the five cards in the collage of the design, in z order: left and width
 * in % of the panel, top in px. A phone stacks the cards.
 */
const slots = [
  { md: ['3.69%', '41px', '46.31%'], xl: ['7.7%', '48px', '45.27%'] },
  { md: ['29.64%', '198px', '44.91%'], xl: ['27.74%', '256px', '45.27%'] },
  { md: ['3.69%', '322px', '40.97%'], xl: ['11.2%', '422px', '33.08%'] },
  { md: ['54.2%', '322px', '42.11%'], xl: ['59.22%', '422px', '33.08%'] },
  { md: ['53.94%', '46px', '42.37%'], xl: ['57.01%', '48px', '33.08%'] },
]

const place = ({ md, xl }: (typeof slots)[number]) => ({
  '--md-x': md[0], '--md-y': md[1], '--md-w': md[2], '--xl-x': xl[0], '--xl-y': xl[1], '--xl-w': xl[2],
}) as CSSProperties

function QuoteCard({ quote, slot }: { quote: Quote; slot: (typeof slots)[number] }) {
  return (
    <figure style={place(slot)} className="relative flex w-78.5 flex-col gap-3.5 overflow-hidden rounded-xl border border-primary bg-primary px-5.5 pt-6.5 pb-5 shadow-tilt-sm md:absolute md:top-(--md-y) md:left-(--md-x) md:w-(--md-w) xl:top-(--xl-y) xl:left-(--xl-x) xl:w-(--xl-w) xl:gap-5 xl:overflow-visible xl:p-12 xl:shadow-tilt">
      <span aria-hidden className="absolute top-0 left-1 font-quote text-quote text-primary xl:-top-6 xl:left-0 xl:text-quote-lg">“</span>
      <blockquote className="text-md font-medium text-primary xl:text-display-xs">{quote.text}</blockquote>
      <figcaption className="text-sm text-tertiary md:text-md md:font-medium xl:text-display-xs">-{quote.name}</figcaption>
      <span aria-hidden className="absolute right-2.5 bottom-0 font-quote text-quote text-primary xl:right-9.75 xl:bottom-0 xl:text-quote-lg">”</span>
    </figure>
  )
}

/** Real quotes that moderators add. The page shows this section only with a full collage (T-23a). */
export function Quotes({ quotes }: { quotes: Quote[] }) {
  return (
    <Container className="flex flex-col gap-5.5 py-14 md:gap-12 md:py-12 xl:gap-16 xl:py-24">
      <SectionHeading className="max-w-63 text-primary md:max-w-none">What our early users say</SectionHeading>
      <div className="flex flex-col items-center gap-5 rounded-xl bg-chat-glow py-5.5 md:relative md:block md:h-130 md:py-0 xl:h-178.5">
        {quotes.map((quote, i) => <QuoteCard key={quote.id} quote={quote} slot={slots[i]!} />)}
      </div>
      <Mascot name="celebrating" className="top-18.5 right-5 size-26 md:top-8.25 md:right-6 md:size-35 xl:top-15.5 xl:right-11 xl:size-54.25" />
    </Container>
  )
}
