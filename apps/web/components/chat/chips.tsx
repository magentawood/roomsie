'use client'

import { useState } from 'react'
import { budgetBands, chipLabels, chipTap, intentLabels, slotPath, type ChipSlot, type ChipTap, type FormA, type LifestyleAxis, type MustHaveKey } from '@roomsie/contract'
import { placeTypes, toggled } from '../../lib/chat'
import { profileLabels } from '../../lib/profile-form'
import { useAreas } from '../../lib/queries'
import { Button } from '../ui/button'
import { CheckChip, TapChip } from '../ui/choice'

function groupLabel(slot: ChipSlot) {
  const [group, key] = slotPath(slot)
  if (group === 'lifestyle') return profileLabels.axes[key as LifestyleAxis]
  if (group === 'mustHaves') return profileLabels.mustHaves[key as MustHaveKey]
  return { intent: 'Place type', areas: 'Areas', budget: 'Budget', roomType: 'Room type', whosMoving: 'Who is moving' }[group]!
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
              : Object.entries(chipLabels(slot)).map(([value, label]) => <TapChip key={value} label={label} onTap={() => onTap(chipTap.parse({ slot, value }))} />)}
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
