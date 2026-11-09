import { alsoLabels, budgetBands, intentsOf, type ChipTap, type CompareRequest, type FormA, type MustHaveKey, type Notice, type PlaceIntent } from '@roomsie/contract'
import { pickOf } from './compare'
import type { Found } from './results'

/** A note of "Roomsie Noticed" (flow 02): its sentence, and the tap of its button. */
export type NoteLine = { text: string; button: string; tap: ChipTap }
/** A chip under the box: a tap, or "Which one's the best deal?", which compares the top cards (T-49). */
export type FollowUp = { label: string; tap: ChipTap } | { label: string; compare: CompareRequest }
type AreaName = (slug: string) => string

/** "₹12.5k", as the designs write a rent. */
export const thousands = (rupees: number) => `₹${Number((rupees / 1000).toFixed(1))}k`
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const many: Record<PlaceIntent, string> = { room: 'rooms in shared flats', pg: 'PGs', whole_flat: 'whole flats', flatmates: 'people' }
const one: Record<PlaceIntent, string> = { room: 'Room', pg: 'PG', whole_flat: 'Flat', flatmates: 'People' }
const joined = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0] ?? '')

/** What few of the results have, and the button that makes it a must: places, then people. */
const fewHave: Record<'places' | 'people', Partial<Record<MustHaveKey, { have: string; button: string }>>> = {
  places: {
    veg_kitchen: { have: 'have a veg kitchen', button: 'Show only veg kitchen' },
    non_smokers: { have: 'are smoke-free', button: 'Show only smoke-free' },
    no_alcohol: { have: 'have no alcohol at home', button: 'Show only no alcohol' },
    couple_friendly: { have: 'welcome couples', button: 'Show only couple friendly' },
  },
  people: {
    veg_kitchen: { have: 'eat veg', button: 'Show only veg eaters' },
    non_smokers: { have: 'don’t smoke', button: 'Show only non-smokers' },
    no_alcohol: { have: 'keep no alcohol at home', button: 'Show only no alcohol' },
    tidy_flatmates: { have: 'are tidy', button: 'Show only tidy people' },
  },
}

/** The words of the notes that the API counted. A note with no words for its kind of results shows nothing. */
export function noteLines(notes: Notice[], form: FormA, areaName: AreaName): NoteLine[] {
  const types = intentsOf(form)
  const people = types[0] === 'flatmates'
  const picks = (Array.isArray(form.areas.value) ? form.areas.value : []).map(areaName)
  const where = picks.length ? joined(picks) : 'Mumbai'
  const what = joined(types.map((type) => many[type]))
  const max = form.budget.value?.max
  return notes.flatMap((note): NoteLine[] => {
    switch (note.kind) {
      case 'mustHave': {
        const tap: ChipTap = { slot: `mustHaves.${note.key}`, value: 'dealbreaker' }
        if (note.key === 'near_station') return [{ text: `${note.count} ${note.count === 1 ? 'is' : 'are'} a 10-min walk or less from a metro or station.`, button: 'Show only near metro', tap }]
        const words = fewHave[people ? 'people' : 'places'][note.key]
        return words ? [{ text: `Heads up, only ${note.count} of ${note.total} ${words.have}, if that matters to you.`, button: words.button, tap }] : []
      }
      case 'teamUp': return [{
        text: `${note.count} ${note.count === 1 ? 'person' : 'people'} looking around ${where} ${note.count === 1 ? 'wants' : 'want'} to team up. Split a 2 BHK and it can cost less than a room.`,
        button: 'Show people to team up with', tap: { slot: 'intent', value: 'flatmates' },
      }]
      case 'rents': {
        const band = budgetBands.find((b) => b.max !== null && b.max >= note.cheapest) ?? budgetBands.at(-1)!
        const usual = note.low !== null && note.high !== null ? `${capital(what)} in ${where} usually go for ${thousands(note.low)} to ${thousands(note.high)} a month. ` : ''
        return [{ text: `${usual}The cheapest one right now is ${thousands(note.cheapest)}.`, button: `Change my budget to ${band.label.toLowerCase()}`, tap: { slot: 'budget', value: band.id } }]
      }
      case 'nearbyArea': return [{
        text: `${max != null ? `Under ${thousands(max)}, ${what}` : capital(what)} do come up in ${areaName(note.area)}, next to ${picks[0] ?? 'your areas'}.`,
        button: `Show ${what} in ${areaName(note.area)}`, tap: { slot: 'areas', value: [note.area] },
      }]
      case 'share': return [{
        text: `A 2 BHK in ${picks[0] ?? 'Mumbai'} split two ways works out to about ${thousands(note.each)} each${note.maintenanceIncluded ? ', maintenance included' : ''}.`,
        button: 'Show people to share with', tap: { slot: 'intent', value: 'flatmates' },
      }]
    }
  })
}

/** The chips under the box. With results: compare the top three, and add the other kinds of place. With none: the next budget, or a different kind of place. */
export function followUps(found: Found, form: FormA, areaName: AreaName): FollowUp[] {
  const types = intentsOf(form)
  const people = types[0] === 'flatmates'
  if (found.total > 0) {
    const top = found.results.slice(0, 3).map(pickOf)
    const chips: FollowUp[] = top.length >= 2 ? [{ label: people ? 'Who fits me best?' : 'Which one’s the best deal?', compare: { kind: top[0]!.kind, ids: top.map((card) => card.id) } }] : []
    if (!people) for (const type of ['pg', 'whole_flat', 'room'] as const) if (!types.includes(type)) chips.push({ label: alsoLabels[type], tap: { slot: 'intent', value: type, also: true } })
    return chips.slice(0, 3)
  }
  const area = Array.isArray(form.areas.value) ? areaName(form.areas.value[0]!) : 'Mumbai'
  const max = form.budget.value?.max
  const next = max == null ? undefined : budgetBands.find((band) => (band.max === null ? band.min >= max : band.max > max))
  const chips: FollowUp[] = next ? [{ label: `${one[types[0] ?? 'room']} in ${area} ${next.max === null ? 'above ₹35k' : `under ${thousands(next.max)}`}`, tap: { slot: 'budget', value: next.id } }] : []
  if (!people) {
    const other = types.includes('room') ? 'pg' : 'room'
    chips.push({ label: `Show some ${many[other]} in ${area} instead`, tap: { slot: 'intent', value: other } })
  }
  return chips
}
