import { intentsOf, type FormA, type LifestyleAxis, type MustHaveKey, type Notice } from '@roomsie/contract'
import type { Db } from '../db/client'
import { listingCounts, rentsOf, twoBhkCosts } from '../listings/match'
import { peopleCounts, teamUpCount } from '../profiles/match'
import type { Filters, Searches, Suggestion } from './search'

/** The must-haves that a note can name, in their order. Women only and men only make no note. */
const placeKeys: MustHaveKey[] = ['veg_kitchen', 'non_smokers', 'no_alcohol', 'couple_friendly']
const personKeys: MustHaveKey[] = ['veg_kitchen', 'non_smokers', 'no_alcohol', 'tidy_flatmates']
/** A must-have that the answers of the person point to comes first: a veg eater hears about the veg kitchens. */
const hintedBy: Partial<Record<MustHaveKey, { axis: LifestyleAxis; values: readonly string[] }>> = {
  veg_kitchen: { axis: 'food', values: ['veg', 'jain'] },
  non_smokers: { axis: 'smoking', values: ['non_smoker'] },
  no_alcohol: { axis: 'drinks', values: ['none_at_home'] },
  tidy_flatmates: { axis: 'tidiness', values: ['very_tidy'] },
}

type Input = { form: FormA; seeksPeople: boolean; viewerUserId?: string; filters: Filters; searches: Searches; total: number; suggestions: Suggestion[] }

/**
 * The notes of "Roomsie Noticed" (flow 02), at most three. With results: a must-have that few of them have, people to team up with,
 * and the walk to a station. With none: the rents of the areas, a nearby area with results, and a 2 BHK split two ways.
 * Each results card has a note (the founders, 2026-11-09): with no other note, the rents of the areas, or a 2 BHK split two ways.
 */
export async function noticesOf(db: Db, input: Input): Promise<Notice[]> {
  return (input.total > 0 ? await withResults(db, input) : await withNone(db, input)).slice(0, 3)
}

async function withResults(db: Db, { form, seeksPeople, viewerUserId, filters, searches, total }: Input) {
  const open = (key: MustHaveKey) => form.mustHaves[key].value !== 'dealbreaker'
  const hinted = (key: MustHaveKey) => {
    const hint = hintedBy[key]
    const answer = hint && form.lifestyle[hint.axis].value
    return !!answer && hint.values.includes(answer)
  }
  // Couple friendly is news only to a couple.
  const keys = (seeksPeople ? personKeys : placeKeys).filter((key) => open(key) && (key !== 'couple_friendly' || form.whosMoving.value === 'couple'))
  const ordered = [...keys.filter(hinted), ...keys.filter((key) => !hinted(key))]
  const station = !seeksPeople && open('near_station')
  const asked: MustHaveKey[] = station ? [...ordered, 'near_station'] : ordered
  const [counts, teamUp] = await Promise.all([
    seeksPeople ? peopleCounts(db, searches.people(filters), asked) : listingCounts(db, searches.listings(filters), asked),
    seeksPeople ? 0 : teamUpCount(db, viewerUserId, filters.areas),
  ])
  const notes: Notice[] = []
  // "Only 6 of 24": half or fewer of three results or more.
  const few = ordered.find((key) => total >= 3 && (counts[key] ?? 0) >= 1 && counts[key]! * 2 <= total)
  if (few) notes.push({ kind: 'mustHave', key: few, count: counts[few]!, total })
  if (teamUp > 0) notes.push({ kind: 'teamUp', count: teamUp })
  const near = counts.near_station ?? 0
  if (near >= 1 && near < total) notes.push({ kind: 'mustHave', key: 'near_station', count: near, total })
  if (notes.length) return notes
  const scope = { viewerUserId, areas: filters.areas }
  const rents = seeksPeople ? [] : await rentsOf(db, { ...scope, kinds: searches.listings(filters).kinds })
  if (rents.length) return [rentsNote(rents)]
  const flats = intentsOf(form).includes('whole_flat') ? [] : await twoBhkCosts(db, scope)
  return flats.length ? [shareNote(flats)] : []
}

/** The cheapest rent, and the middle half of the rents when there are four or more. */
function rentsNote(rents: number[]): Notice {
  const middle = rents.length >= 4
  return {
    kind: 'rents', cheapest: rents[0]!,
    low: middle ? rents[Math.floor((rents.length - 1) / 4)]! : null, high: middle ? rents[Math.ceil(((rents.length - 1) * 3) / 4)]! : null,
  }
}

/** The middle cost of a 2 BHK, rent and maintenance, split two ways. */
function shareNote(flats: Awaited<ReturnType<typeof twoBhkCosts>>): Notice {
  const costs = flats.map((flat) => flat.rent + (flat.maintenance ?? 0)).sort((a, b) => a - b)
  const middle = costs[Math.floor((costs.length - 1) / 2)]!
  return { kind: 'share', each: Math.round(middle / 2 / 500) * 500, maintenanceIncluded: flats.every((flat) => flat.maintenance !== null) }
}

async function withNone(db: Db, { form, seeksPeople, viewerUserId, filters, searches, suggestions }: Input) {
  const nearby = suggestions.find((s) => s.relaxed.kind === 'area')?.relaxed
  const nearbyNote: Notice[] = nearby?.kind === 'area' ? [{ kind: 'nearbyArea', area: nearby.area }] : []
  if (seeksPeople) return nearbyNote

  const scope = { viewerUserId, areas: filters.areas }
  const [rents, flats] = await Promise.all([
    rentsOf(db, { ...scope, kinds: searches.listings(filters).kinds }),
    // A search of whole flats needs no sum of a shared flat.
    intentsOf(form).includes('whole_flat') ? [] : twoBhkCosts(db, scope),
  ])
  const notes: Notice[] = []
  const max = filters.budget?.max
  // The budget is the reason: the cheapest place is above it.
  if (rents.length && max != null && rents[0]! > max) notes.push(rentsNote(rents))
  notes.push(...nearbyNote)
  if (flats.length) notes.push(shareNote(flats))
  return notes
}
