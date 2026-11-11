import { ArrowRight, Home02, User01 } from '@untitledui/icons'
import { stackCount, type Stack } from '../../lib/results'

/**
 * The place of each photo of the stack, as frame 37 of 42:12983: 59 px squares, 15 px apart. The back one leans left,
 * and the front one leans right and sits on top.
 */
const tiles = ['top-1.25 left-1 -rotate-[7.7deg]', 'top-1.25 left-4.5', 'top-1.25 left-8.5 rotate-[10.1deg]']

function PhotoStack({ photos, people }: Stack) {
  const PlaceholderIcon = people ? User01 : Home02
  // A search with no results still shows one tile, so the card keeps its shape. One photo sits in the middle, and two lean apart.
  const shown = photos.length ? photos : [null]
  const places = shown.length === 1 ? [1] : shown.length === 2 ? [0, 2] : [0, 1, 2]
  return (
    <span aria-hidden className="relative h-17 w-24.5 shrink-0">
      {shown.map((url, i) => (
        <span key={i} className={`absolute flex size-14.75 items-center justify-center overflow-hidden rounded-sm border border-primary bg-primary text-fg-quaternary ${tiles[places[i]!]}`}>
          {url ? <img src={url} alt="" className="size-full object-cover" /> : <PlaceholderIcon size={20} />}
        </span>
      ))}
    </span>
  )
}

/**
 * The results as a card in the chat of flow 02: the photos of the first results, and the count (42:12983). The title of the
 * search is for a screen reader only, as the designs show the count alone. On a phone, "Show all" opens the results above the
 * input (PD6a).
 */
export function ResultsCard({ title, count, stack, onOpen }: { title: string; count: number; stack: Stack; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-md border border-secondary bg-secondary px-2.75 py-1.75 text-left outline-focus-ring hover:bg-primary_hover focus-visible:outline-2">
      <PhotoStack {...stack} />
      <span className="min-w-0 flex-1 text-sm font-medium text-secondary"><span className="sr-only">{title}: </span>{stackCount(count, stack.people)}</span>
      {/* On a phone, "Show all" is a small secondary button (148:32593); from lg, a round arrow (42:12983). */}
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary p-1.5 text-fg-quaternary shadow-xs-skeuomorphic max-lg:rounded-md max-lg:px-2.5 max-lg:py-1.5">
        <span className="px-0.5 text-sm font-semibold text-secondary lg:hidden">Show all</span>
        <ArrowRight aria-hidden className="size-4 lg:size-5" />
      </span>
    </button>
  )
}
