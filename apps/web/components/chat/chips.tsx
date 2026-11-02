'use client'

import { useState } from 'react'
import { budgetBands, intentLabels, type ChipSlot, type ChipTap, type FormA } from '@roomsie/contract'
import { placeTypes, toggled } from '../../lib/chat'
import { useAreas } from '../../lib/queries'
import { Button } from '../ui/button'
import { CheckChip, TapChip } from '../ui/choice'

const groupLabels: Record<ChipSlot, string> = { intent: 'Place type', areas: 'Areas', budget: 'Budget' }

export function Chips({ slot, form, onTap }: { slot: ChipSlot; form: FormA; onTap: (tap: ChipTap) => void }) {
  return (
    <div role="group" aria-label={groupLabels[slot]} className="flex flex-col items-start gap-3">
      {slot === 'areas' ? <AreaChips onDone={(value) => onTap({ slot, value })} /> : (
        <div className="flex flex-wrap gap-2">
          {slot === 'intent'
            ? placeTypes(form).map((intent) =>
              <TapChip key={intent} label={intentLabels[intent]} onTap={() => onTap({ slot, value: intent })} />)
            : budgetBands.map((band) => <TapChip key={band.id} label={band.label} onTap={() => onTap({ slot, value: band.id })} />)}
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
