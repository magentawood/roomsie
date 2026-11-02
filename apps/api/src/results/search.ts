import { budgetBands, mustHaveKeys, resultsPageSize, type FormA, type ListingKind, type MatchResult, type MustHaveKey } from '@roomsie/contract'
import { areaParents, lineage, matchingAreas, neighboursOf } from '../areas'
import type { Db } from '../db/client'
import { inOrder } from '../in-order'
import { matchingListings } from '../listings/match'
import { listingsByIds, listingView, partsOf } from '../listings/read'
import { matchingPeople, searcherMustHaves, type SearcherAnswers } from '../profiles/match'
import { answersFor, cardView, profileOf, profilesByIds } from '../profiles/read'
import type { BaseSearch } from '../ranking'
import type { Storage } from '../storage'
import type { Matching } from './settings'

/** The place type of a seeker and the kinds of listing that it sees. A flatmates seeker sees people (PD3a). */
const listingKindsOf: Record<'room' | 'pg' | 'whole_flat', ListingKind[]> = { room: ['room_in_flat'], pg: ['pg'], whole_flat: ['owner_flat', 'broker_flat'] }
const suggestedCards = 4

type Deps = { db: Db; storage: Storage; matching: Matching }
type Ranked = { id: string; didntSay: MustHaveKey[]; bestMatch: boolean }
type Filters = Pick<BaseSearch, 'areas' | 'budget'>

/** The search of a Form A: the page, and the suggested posts when it finds nothing (PD6c). */
export async function searchResults(deps: Deps, form: FormA, viewerUserId: string | undefined, page: number) {
  const { db, matching } = deps
  const intent = form.intent.value
  if (!intent || intent === 'unclear') return { results: [], total: 0, suggestions: [] }

  const weightOf = (weight: 'prefer' | 'dealbreaker') => mustHaveKeys.filter((key) => form.mustHaves[key].value === weight)
  const answers: SearcherAnswers = Object.fromEntries(Object.entries(form.lifestyle).flatMap(([axis, slot]) => (slot.value && slot.value !== 'unclear' ? [[axis, slot.value]] : [])))
  const gender = viewerUserId ? (await profileOf(db, viewerUserId))?.gender ?? null : null
  if (gender) answers.gender = gender
  const roomType = form.roomType.value === 'unclear' ? null : form.roomType.value
  const common = { viewerUserId, moveDate: form.moveDate.value, dealbreakers: weightOf('dealbreaker'), preferences: weightOf('prefer') }
  const parentOf = await areaParents(db)
  const picks = form.areas.value ?? []

  const runSearch = async ({ areas, budget }: Filters, limit: number, offset: number): Promise<{ results: MatchResult[]; total: number }> => {
    if (intent === 'flatmates') {
      const { rows, total } = await matchingPeople(db, {
        ...common, areas, budget, limit, offset, searcher: searcherMustHaves(answers), formBFloor: matching.formBFloor,
        religion: form.religionPreference.value, community: form.communityPreference.value,
      })
      return { results: await personResults(deps, rows), total }
    }
    const { rows, total } = await matchingListings(db, {
      ...common, areas, budget, limit, offset, roomType, gender, whosMoving: form.whosMoving.value, kinds: listingKindsOf[intent],
    })
    return { results: await listingResults(deps, rows), total }
  }

  const filters: Filters = { areas: picks.length ? matchingAreas(parentOf, picks) : null, budget: form.budget.value }
  const { results, total } = await runSearch(filters, resultsPageSize, (page - 1) * resultsPageSize)
  if (total > 0) return { results, total, suggestions: [] }

  // The next budget band, and the neighbouring area groups: one change at a time.
  const nextBand = nextBandOf(filters.budget?.max)
  const groups = [...new Set(picks.map((pick) => lineage(parentOf, pick).at(-1)!))]
  const neighbours = groups.length ? (await neighboursOf(db, groups)).slice(0, 2) : []
  const relaxedSearches = [
    ...(nextBand ? [{ relaxed: { kind: 'budget' as const, ...nextBand }, filters: { ...filters, budget: { min: filters.budget!.min, ...nextBand } } }] : []),
    ...neighbours.map((area) => ({ relaxed: { kind: 'area' as const, area }, filters: { ...filters, areas: matchingAreas(parentOf, [area]) } })),
  ]
  const suggestions = await Promise.all(relaxedSearches.map(async (r) => ({ relaxed: r.relaxed, results: (await runSearch(r.filters, suggestedCards, 0)).results })))
  return { results, total, suggestions: suggestions.filter((s) => s.results.length) }
}

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
