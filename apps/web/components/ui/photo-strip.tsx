'use client'

import { useRef, useState, type ReactNode } from 'react'
import { CardLink } from './card-link'

/**
 * The photos of a card (67:6750): a swipe or a scroll moves to the next photo, and "Pagination dot group" shows which one.
 * The strip sits above the link of the whole card, so a swipe scrolls it and a tap still opens the card. The dots are
 * buttons beside the link, never in it. `dots`: "hover" shows them on a phone and under the pointer of a computer (the places);
 * "phone" only on a phone (the people). A selected card has none, as in the designs. `faces`: the dots of a computer move to
 * the right, clear of the faces of the flatmates.
 */
export function PhotoStrip({ urls, href, onOpen, dots, faces, selected, children }: {
  urls: string[]; href: string; onOpen?: () => void; dots: 'hover' | 'phone'; faces?: boolean; selected?: boolean; children?: ReactNode
}) {
  const strip = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState(0)
  const go = (index: number) => strip.current?.scrollTo({ left: index * strip.current.clientWidth, behavior: 'smooth' })
  const shown = dots === 'hover'
    ? '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100 focus-within:opacity-100'
    : '[@media(hover:hover)]:hidden'
  const place = faces ? 'max-lg:left-1/2 max-lg:-translate-x-1/2 lg:right-2.5' : 'left-1/2 -translate-x-1/2'
  return (
    <>
      <CardLink href={href} onOpen={onOpen} decorative className="block size-full">
        <div ref={strip} onScroll={(e) => setAt(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]">
          {urls.map((url, i) => <img key={url} src={url} alt="" loading={i ? 'lazy' : undefined} className="size-full shrink-0 snap-start object-cover" />)}
        </div>
        {children}
      </CardLink>
      {urls.length > 1 && !selected && (
        <span className={`absolute bottom-2 flex gap-3 rounded-full bg-primary/90 p-2 transition-opacity ${place} ${shown}`}>
          {urls.map((url, i) => (
            <button key={url} type="button" aria-label={`Photo ${i + 1} of ${urls.length}`} aria-current={i === at} onClick={() => go(i)}
              className={`relative size-2 rounded-full outline-focus-ring after:absolute after:-inset-1.5 focus-visible:outline-2 ${i === at ? 'bg-alpha-black-60' : 'bg-quaternary'}`} />
          ))}
        </span>
      )}
    </>
  )
}
