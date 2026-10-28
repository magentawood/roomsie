import type { Quote } from '@roomsie/contract'
import { Container, Mascot, SectionHeading } from './parts'

/**
 * The places of the five cards in the collage of the design, in z order: left and width
 * in % of the panel. A phone stacks the cards. Classes, because the CSP blocks a style attribute (T-52).
 */
const placeClasses = [
  'md:left-[3.69%] md:top-10.25 md:w-[46.31%] xl:left-[7.7%] xl:top-12 xl:w-[45.27%]',
  'md:left-[29.64%] md:top-49.5 md:w-[44.91%] xl:left-[27.74%] xl:top-64 xl:w-[45.27%]',
  'md:left-[3.69%] md:top-80.5 md:w-[40.97%] xl:left-[11.2%] xl:top-105.5 xl:w-[33.08%]',
  'md:left-[54.2%] md:top-80.5 md:w-[42.11%] xl:left-[59.22%] xl:top-105.5 xl:w-[33.08%]',
  'md:left-[53.94%] md:top-11.5 md:w-[42.37%] xl:left-[57.01%] xl:top-12 xl:w-[33.08%]',
]

function QuoteCard({ quote, className }: { quote: Quote; className: string }) {
  return (
    <figure className={`relative flex w-78.5 flex-col gap-3.5 overflow-hidden rounded-xl border border-primary bg-primary px-5.5 pt-6.5 pb-5 shadow-tilt-sm md:absolute xl:gap-5 xl:overflow-visible xl:p-12 xl:shadow-tilt ${className}`}>
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
        {quotes.map((quote, i) => <QuoteCard key={quote.id} quote={quote} className={placeClasses[i]!} />)}
      </div>
      <Mascot name="celebrating" className="top-18.5 right-5 size-26 md:top-8.25 md:right-6 md:size-35 xl:top-15.5 xl:right-11 xl:size-54.25" />
    </Container>
  )
}
