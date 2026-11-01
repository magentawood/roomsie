import { ArrowRight, Home02 } from '@untitledui/icons'
import { countLine } from '../../lib/results'

/** The results as a card in the chat of flow 02. On a phone, "Show all" opens the results above the input (PD6a). */
export function ResultsCard({ title, count, onOpen }: { title: string; count: number; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl border border-secondary bg-secondary p-3 text-left outline-focus-ring hover:bg-primary_hover focus-visible:outline-2">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-tertiary text-fg-quaternary"><Home02 size={24} aria-hidden /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-primary">{title}</span>
        <span className="text-sm text-tertiary">{countLine(count)}</span>
      </span>
      <span className="flex items-center gap-1 text-sm font-medium text-secondary">
        <span className="lg:hidden">Show all</span>
        <span className="rounded-full border border-primary bg-primary p-2"><ArrowRight size={16} aria-hidden /></span>
      </span>
    </button>
  )
}
