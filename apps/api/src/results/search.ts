import { budgetBands, intentsOf, listingKinds, mustHaveKeys, resultsPageSize, type CompareKind, type FormA, type ListingKind, type MatchResult, type MustHaveKey, type Notice, type PlaceIntent } from '@roomsie/contract'
import { areaParents, lineage, matchingAreas, neighboursOf } from '../areas'
import type { Db } from '../db/client'
import { inOrder } from '../in-order'
import { matchingListings, type ListingSearch } from '../listings/match'
import { listingsByIds, listingView, partsOf } from '../listings/read'
import { matchingPeople, searcherMustHaves, type PeopleSearch, type SearcherAnswers } from '../profiles/match'
import { answersFor, cardView, profileOf, profilesByIds } from '../profiles/read'
import type { BaseSearch } from '../ranking'
import type { Storage } from '../storage'
import { noticesOf } from './noticed'
import type { Matching } from './settings'

/** The place type of a seeker and the kinds of listing that it sees. A flatmates seeker sees people (PD3a). */
const listingKindsOf: Record<Exclude<PlaceIntent, 'flatmates'>, ListingKind[]> = { room: ['room_in_flat'], pg: ['pg'], whole_flat: ['owner_flat', 'broker_flat'] }
const suggestedCards = 4

type Deps = { db: Db; storage: Storage; matching: Matching }
type Ranked = { id: string; didntSay: MustHaveKey[]; bestMatch: boolean }
export type Filters = Pick<BaseSearch, 'areas' | 'budget'>
/** The two searches of a form, for a page or for the counts of the notes. */
export type Searches = { people: (filters: Filters) => PeopleSearch; listings: (filters: Filters) => ListingSearch }

/** The two searches of a form, and the filters of its areas and budget. */
async function searchesOf({ db, matching }: Deps, form: FormA, viewerUserId: string | undefined) {
  const types = intentsOf(form)
  const weightOf = (weight: 'prefer' | 'dealbreaker') => mustHaveKeys.filter((key) => form.mustHaves[key].value === weight)
  const answers: SearcherAnswers = Object.fromEntries(Object.entries(form.lifestyle).flatMap(([axis, slot]) => (slot.value && slot.value !== 'unclear' ? [[axis, slot.value]] : [])))
  const gender = viewerUserId ? (await profileOf(db, viewerUserId))?.gender ?? null : null
  if (gender) answers.gender = gender
  const roomType = form.roomType.value === 'unclear' ? null : form.roomType.value
  const common = { viewerUserId, moveDate: form.moveDate.value, dealbreakers: weightOf('dealbreaker'), preferences: weightOf('prefer') }
  const parentOf = await areaParents(db)
  const picks = form.areas.value ?? []

  const searches: Searches = {
    people: ({ areas, budget }) => ({
      ...common, areas, budget, limit: 0, offset: 0, searcher: searcherMustHaves(answers), formBFloor: matching.formBFloor,
      religionPreference: form.religionPreference.value, communityPreference: form.communityPreference.value,
    }),
    listings: ({ areas, budget }) => ({
      ...common, areas, budget, limit: 0, offset: 0, roomType, gender, whosMoving: form.whosMoving.value,
      kinds: types.flatMap((type) => (type === 'flatmates' ? [] : listingKindsOf[type])),
    }),
  }
  const filters: Filters = { areas: picks.length ? matchingAreas(parentOf, picks) : null, budget: form.budget.value }
  return { searches, filters, parentOf, picks }
}

/** The search of a Form A: the page, the suggested posts when it finds nothing (PD6c), and the notes of the first page. */
export async function searchResults(deps: Deps, form: FormA, viewerUserId: string | undefined, page: number) {
  const { db } = deps
  const types = intentsOf(form)
  if (!types.length) return { results: [], total: 0, suggestions: [], noticed: [] as Notice[] }
  // People to rent with go alone, and kinds of place add up (PD15).
  const seeksPeople = types[0] === 'flatmates'
  const { searches, filters, parentOf, picks } = await searchesOf(deps, form, viewerUserId)
  const runSearch = async (filters: Filters, limit: number, offset: number): Promise<{ results: MatchResult[]; total: number }> => {
    if (seeksPeople) {
      const { rows, total } = await matchingPeople(db, { ...searches.people(filters), limit, offset })
      return { results: await personResults(deps, rows), total }
    }
    const { rows, total } = await matchingListings(db, { ...searches.listings(filters), limit, offset })
    return { results: await listingResults(deps, rows), total }
  }

  const { results, total } = await runSearch(filters, resultsPageSize, (page - 1) * resultsPageSize)
  const notes = (suggestions: Suggestion[]) => (page === 1 ? noticesOf(db, { form, seeksPeople, viewerUserId, filters, searches, total, suggestions }) : Promise.resolve([]))
  if (total > 0) return { results, total, suggestions: [], noticed: await notes([]) }

  // The next budget band, and the neighbouring area groups: one change at a time.
  const nextBand = nextBandOf(filters.budget?.max)
  const groups = [...new Set(picks.map((pick) => lineage(parentOf, pick).at(-1)!))]
  const neighbours = groups.length ? (await neighboursOf(db, groups)).slice(0, 2) : []
  const relaxedSearches = [
    ...(nextBand ? [{ relaxed: { kind: 'budget' as const, ...nextBand }, filters: { ...filters, budget: { min: filters.budget!.min, ...nextBand } } }] : []),
    ...neighbours.map((area) => ({ relaxed: { kind: 'area' as const, area }, filters: { ...filters, areas: matchingAreas(parentOf, [area]) } })),
  ]
  const suggestions = (await Promise.all(relaxedSearches.map(async (r) => ({ relaxed: r.relaxed, results: (await runSearch(r.filters, suggestedCards, 0)).results }))))
    .filter((s) => s.results.length)
  return { results, total, suggestions, noticed: await notes(suggestions) }
}

/**
 * The "Best match" label of one card for a form, whatever the place types of the form: the match box of a detail (PD3a).
 * The hidden slots do not count, so the label tells nothing of the religion or the community of a person (PD3c).
 */
export async function fitOf(deps: Deps, form: FormA, viewerUserId: string | undefined, card: { kind: CompareKind; id: string }) {
  const open = { source: 'empty', value: null } as const
  const { searches, filters } = await searchesOf(deps, { ...form, religionPreference: open, communityPreference: open }, viewerUserId)
  const only = { ids: [card.id], limit: 1, offset: 0 }
  const { rows } = card.kind === 'person'
    ? await matchingPeople(deps.db, { ...searches.people(filters), ...only })
    : await matchingListings(deps.db, { ...searches.listings(filters), kinds: [...listingKinds], ...only })
  return { bestMatch: rows[0]?.bestMatch ?? false }
}
export type Suggestion = { relaxed: { kind: 'budget'; max: number | null } | { kind: 'area'; area: string }; results: MatchResult[] }

/** The next budget band. No maximum: the band "above 35k". Undefined: no next band, above 35k or with no budget. */
function nextBandOf(max: number | null | undefined): { max: number | null } | undefined {
  if (max == null) return undefined
  const next = budgetBands.find((band) => (band.max === null ? band.min >= max : band.max > max))
  return next && { max: next.max }
}

const labelsOf = (ranked: Ranked[]) => new Map(ranked.map(({ id, ...labels }) => [id, labels]))

async function personResults({ db, storage }: Deps, ranked: Ranked[]): Promise<MatchResult[]> {
  const ids = ranked.map((r) => r.id)
  const [rows, answers] = await Promise.all([profilesByIds(db, ids), answersFor(db, ids)])
  const labels = labelsOf(ranked)
  return inOrder(ids, rows).map((row) => ({ kind: 'person', card: cardView(row, answers(row.id), storage), ...labels.get(row.id)! }))
}

async function listingResults({ db, storage }: Deps, ranked: Ranked[]): Promise<MatchResult[]> {
  const ids = ranked.map((r) => r.id)
  const [rows, parts] = await Promise.all([listingsByIds(db, ids), partsOf(db, ids)])
  const labels = labelsOf(ranked)
  return inOrder(ids, rows).map((row) => ({ kind: 'listing', listing: listingView(row, parts(row.id), storage, false), ...labels.get(row.id)! }))
}
