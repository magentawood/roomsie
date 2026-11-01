import { sql } from 'drizzle-orm'
import { mustHaveKeys, type FormA, type ListingKind, type MatchResult, type MustHaveKey } from '@roomsie/contract'
import { areaParents, groupOf, matchingAreas, neighboursOf } from '../areas'
import type { Db } from '../db/client'
import { matchingListings } from '../listings/match'
import { listingsByIds, listingView, partsOf } from '../listings/read'
import { formBPoints } from '../observations/read'
import { matchingPeople, searcherAgainst, type SearcherAnswers } from '../profiles/match'
import { answersFor, cardView, profileOf, profilesByIds } from '../profiles/read'
import type { Storage } from '../storage'
import type { Matching } from './settings'

/** The place type of a seeker and the kinds of listing that it sees. A flatmates seeker sees people (PD3a). */
const listingKindsOf: Record<'room' | 'pg' | 'whole_flat', ListingKind[]> = { room: ['room_in_flat'], pg: ['pg'], whole_flat: ['owner_flat', 'broker_flat'] }
/** The budget bands of the chips (interface-shape.md). */
const budgetBands = [10_000, 15_000, 25_000, 35_000]
const suggestedCards = 4

type Deps = { db: Db; storage: Storage; matching: Matching }
type Ranked = { id: string; didntSay: MustHaveKey[]; bestMatch: boolean }
type Filters = { areas: string[] | null; budget: { min: number | null; max: number | null } | null }

/** The search of a Form A: the page, and the suggested posts when it finds nothing (PD6c). */
export async function searchResults({ db, storage, matching }: Deps, form: FormA, viewerUserId: string | undefined, page: number, pageSize: number) {
  const seeks = form.intent.value
  if (!seeks || seeks === 'unclear') return { results: [], total: 0, suggestions: [] }
  const intent = seeks

  const weightOf = (weight: 'prefer' | 'dealbreaker') => mustHaveKeys.filter((key) => form.mustHaves[key].value === weight)
  const answers: SearcherAnswers = Object.fromEntries(Object.entries(form.lifestyle).flatMap(([axis, slot]) => (slot.value && slot.value !== 'unclear' ? [[axis, slot.value]] : [])))
  const gender = viewerUserId ? (await profileOf(db, viewerUserId))?.gender ?? null : null
  if (gender) answers.gender = gender
  const roomType = form.roomType.value === 'private' || form.roomType.value === 'shared' ? form.roomType.value : null
  const common = {
    viewerUserId, moveDate: form.moveDate.value, dealbreakers: weightOf('dealbreaker'), preferences: weightOf('prefer'),
  }
  const parentOf = await areaParents(db)
  const picks = form.areas.value ?? []

  async function run({ areas, budget }: Filters, limit: number, offset: number): Promise<{ results: MatchResult[]; total: number }> {
    if (intent === 'flatmates') {
      const { rows, total } = await matchingPeople(db, {
        ...common, areas, budget, limit, offset, searcher: searcherAgainst(answers),
        formBPoints: (person) => (viewerUserId ? formBPoints(viewerUserId, person, matching.formBFloor) : sql`0`),
      })
      return { results: await personResults(db, storage, rows), total }
    }
    const { rows, total } = await matchingListings(db, { ...common, areas, budget, limit, offset, roomType, gender, kinds: listingKindsOf[intent] })
    return { results: await listingResults(db, storage, rows, viewerUserId), total }
  }

  const filters: Filters = { areas: picks.length ? matchingAreas(parentOf, picks) : null, budget: form.budget.value }
  const { results, total } = await run(filters, pageSize, (page - 1) * pageSize)
  if (total > 0) return { results, total, suggestions: [] }

  // The next budget band, and the neighbouring area groups: one change at a time.
  const nextBand = filters.budget?.max != null ? budgetBands.find((band) => band > filters.budget!.max!) : undefined
  const groups = [...new Set(picks.map((pick) => groupOf(parentOf, pick)))]
  const neighbours = groups.length ? (await neighboursOf(db, groups)).slice(0, 2) : []
  const relaxed = [
    ...(nextBand ? [{ relaxed: { kind: 'budget' as const, max: nextBand }, filters: { ...filters, budget: { ...filters.budget!, max: nextBand } } }] : []),
    ...neighbours.map((area) => ({ relaxed: { kind: 'area' as const, area }, filters: { ...filters, areas: matchingAreas(parentOf, [area]) } })),
  ]
  const suggestions = await Promise.all(relaxed.map(async (r) => ({ relaxed: r.relaxed, results: (await run(r.filters, suggestedCards, 0)).results })))
  return { results, total, suggestions: suggestions.filter((s) => s.results.length) }
}

/** The rows in the order of the ranked ids. */
const inOrder = <T extends { id: string }>(ranked: Ranked[], rows: T[]) => {
  const byId = new Map(rows.map((r) => [r.id, r]))
  return ranked.flatMap((r) => (byId.has(r.id) ? [{ rank: r, row: byId.get(r.id)! }] : []))
}

async function personResults(db: Db, storage: Storage, ranked: Ranked[]): Promise<MatchResult[]> {
  if (!ranked.length) return []
  const ids = ranked.map((r) => r.id)
  const [rows, answers] = await Promise.all([profilesByIds(db, ids), answersFor(db, ids)])
  return inOrder(ranked, rows).map(({ rank, row }) => ({ kind: 'person', card: cardView(row, answers(row.id), storage), bestMatch: rank.bestMatch, didntSay: rank.didntSay }))
}

async function listingResults(db: Db, storage: Storage, ranked: Ranked[], viewerUserId?: string): Promise<MatchResult[]> {
  if (!ranked.length) return []
  const ids = ranked.map((r) => r.id)
  const [rows, parts] = await Promise.all([listingsByIds(db, ids), partsOf(db, ids)])
  return inOrder(ranked, rows).map(({ rank, row }) => ({
    kind: 'listing', listing: listingView(row, parts(row.id), storage, row.ownerUserId === viewerUserId), bestMatch: rank.bestMatch, didntSay: rank.didntSay,
  }))
}
