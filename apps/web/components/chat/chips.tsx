'use client'

import { useState } from 'react'
import { budgetBands, chipAnswers, chipTap, intentLabels, slotPath, type AnswerChipSlot, type ChipSlot, type ChipTap, type FormA, type LifestyleAxis } from '@roomsie/contract'
import { placeTypes, toggled } from '../../lib/chat'
import { profileLabels } from '../../lib/profile-form'
import { useAreas } from '../../lib/queries'
import { Button } from '../ui/button'
import { CheckChip, TapChip } from '../ui/choice'

/** The name of each group of chips for a screen reader. */
function groupLabel(slot: ChipSlot) {
  const [group, key] = slotPath(slot)
  if (group === 'lifestyle') return profileLabels.axes[key as LifestyleAxis]
  if (group === 'mustHaves') return `How strict: ${profileLabels.mustHaves[key as keyof typeof profileLabels.mustHaves]}`
  return { intent: 'Place type', areas: 'Areas', budget: 'Budget', roomType: 'Room type', whosMoving: 'Who is moving' }[group]!
}

/** One tap for each answer of a closed question, from the answers of the contract (T-59). */
function AnswerChips({ slot, onTap }: { slot: AnswerChipSlot; onTap: (tap: ChipTap) => void }) {
  return chipAnswers(slot).map(({ value, label }) => <TapChip key={value} label={label} onTap={() => onTap(chipTap.parse({ slot, value }))} />)
}

export function Chips({ slot, form, onTap }: { slot: ChipSlot; form: FormA; onTap: (tap: ChipTap) => void }) {
  return (
    <div role="group" aria-label={groupLabel(slot)} className="flex flex-col items-start gap-3">
      {slot === 'areas' ? <AreaChips onDone={(value) => onTap({ slot, value })} /> : (
        <div className="flex flex-wrap gap-2">
          {slot === 'intent'
            ? placeTypes(form).map((intent) =>
              <TapChip key={intent} label={intentLabels[intent]} onTap={() => onTap({ slot, value: intent })} />)
            : slot === 'budget'
              ? budgetBands.map((band) => <TapChip key={band.id} label={band.label} onTap={() => onTap({ slot, value: band.id })} />)
              : <AnswerChips slot={slot} onTap={onTap} />}
        </div>
      )}
    </div>
  )
}

function AreaChips({ onDone }: { onDone: (slugs: string[]) => void }) {
  const groups = (useAreas().data?.areas ?? []).filter((area) => !area.parent)
  const [picks, setPicks] = useState<string[]>([])
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => <CheckChip key={group.slug} label={group.name} checked={picks.includes(group.slug)} onToggle={() => setPicks(toggled(picks, group.slug))} />)}
      </div>
      <Button variant="primary" size="sm" disabled={!picks.length} onClick={() => onDone(picks)}>Done</Button>
    </>
  )
}
