import { formA, slotPath, type Budget, type ExtractorOutput, type FormA, type FormASlot } from '@roomsie/contract'

/** The values of one turn, as the slots of Form A. */
export type SlotValues = Partial<Record<FormASlot, unknown>>
type Slot = { source: 'empty' | 'stated' | 'default'; value: unknown }

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export function slotOf(form: FormA, slot: FormASlot): Slot {
  const [group, key] = slotPath(slot)
  const record = form as unknown as Record<string, Record<string, Slot>>
  return (key ? record[group]![key] : record[group]) as Slot
}

function withSlot(form: FormA, slot: FormASlot, value: unknown): FormA {
  const [group, key] = slotPath(slot)
  const stated = { source: 'stated', value }
  const record = form as unknown as Record<string, Record<string, unknown>>
  return { ...form, [group]: key ? { ...record[group], [key]: stated } : stated }
}

/** One budget bound of the turn can fill the other bound of the form. A different value of a bound is a conflict. */
function budgetOf(earlier: Budget, later: Budget): Budget | 'conflict' {
  const differs = (a: number | null, b: number | null) => a != null && b != null && a !== b
  if (differs(earlier.min, later.min) || differs(earlier.max, later.max)) return 'conflict'
  const both = { min: later.min ?? earlier.min, max: later.max ?? earlier.max }
  return both.min != null && both.max != null && both.min > both.max ? 'conflict' : both
}

/**
 * Puts the values of a turn into the form. A value never replaces an earlier stated value: that is a conflict,
 * and the assistant asks which to keep (PD3b). `answering` is the slot of that question: its value wins.
 * A new area adds to the areas of the form (T-12).
 */
export function applyValues(form: FormA, values: SlotValues, answering: FormASlot | null) {
  let next = form
  const changed: FormASlot[] = []
  const conflicts: ExtractorOutput['conflicts'] = []
  for (const [slot, later] of Object.entries(values) as [FormASlot, unknown][]) {
    const { source, value: earlier } = slotOf(next, slot)
    const open = source !== 'stated' || slot === answering
    let value = later
    if (slot === 'areas' && Array.isArray(earlier)) {
      value = [...new Set([...earlier, ...(later as string[])])].slice(0, 20)
    } else if (slot === 'budget' && !open) {
      const both = budgetOf(earlier as Budget, later as Budget)
      if (both === 'conflict') {
        conflicts.push({ slot, earlier, later })
        continue
      }
      value = both
    } else if (later === 'unclear' && source === 'stated' && earlier !== 'unclear') {
      continue
    } else if (!open && earlier !== 'unclear' && !same(earlier, later)) {
      conflicts.push({ slot, earlier, later })
      continue
    }
    if (source === 'stated' && same(earlier, value)) continue
    next = withSlot(next, slot, value)
    changed.push(slot)
  }
  return { form: formA.parse(next), changed, conflicts }
}
