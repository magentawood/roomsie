import { CornerDownRight, Stars02 } from '@untitledui/icons'
import type { ChipTap } from '@roomsie/contract'
import type { FollowUp, NoteLine } from '../../lib/noticed'
import { Button } from '../ui/button'

/** "Roomsie Noticed" of flow 02: what the code counted in the results, each note with a button that changes the search. */
export function NoticedBox({ lines, onTap }: { lines: NoteLine[]; onTap: (tap: ChipTap) => void }) {
  return (
    // The text sits 12 in from the outside of the 1.5 px rainbow border, as in the designs.
    <section aria-label="Roomsie Noticed" className="flex flex-col gap-4 rounded-lg bg-noticed p-[10.5px]">
      <h2 className="flex items-center gap-2 text-md font-semibold text-secondary"><Stars02 size={24} aria-hidden className="text-noticed" />Roomsie Noticed</h2>
      <ul className="flex flex-col divide-y divide-secondary">
        {lines.map((line) => (
          <li key={line.text} className="flex flex-col items-start gap-3 pt-4 pb-3.75 first:pt-0 last:pb-0">
            <p className="text-sm text-secondary">{line.text}</p>
            <Button variant="secondary" size="xs" onClick={() => onTap(line.tap)}>{line.button}</Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The chips under the box. Each one is the next message of the person. */
export function FollowUps({ chips, onPick }: { chips: FollowUp[]; onPick: (chip: FollowUp) => void }) {
  return (
    <div role="group" aria-label="Ask next" className="flex flex-col items-start gap-2">
      {chips.map((chip) => <Button key={chip.label} variant="secondary" size="xs" iconLeading={CornerDownRight} onClick={() => onPick(chip)}>{chip.label}</Button>)}
    </div>
  )
}
