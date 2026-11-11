import { z } from 'zod'
import { compareKinds } from './compare'
import { formA } from './form-a'
import { listingResponse } from './listings'
import { cardResponse, mustHaveKeys } from './profiles'
import { areaSlug, rupees } from './shared'

const resultLabels = {
  /** The card meets all the preferences, and the searcher stated three or more (PD3a). */
  bestMatch: z.boolean(),
  /** The dealbreakers of the searcher that the card did not answer. */
  didntSay: z.array(z.enum(mustHaveKeys)),
}

/** One card of the results: a person or a listing (PD14). */
export const matchResult = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('person'), card: cardResponse, ...resultLabels }),
  z.object({ kind: z.literal('listing'), listing: listingResponse, ...resultLabels }),
])
export type MatchResult = z.infer<typeof matchResult>

export const resultsPageSize = 20

/** A search: the panel is a function of the form only (PD6c). */
/** The orders of the results panel (the founders, 2026-11-11). "best" is the Best Matches order of PD3a. People sort by best or newest. */
export const resultSorts = ['best', 'rent_low', 'rent_high', 'newest'] as const
export type ResultSort = (typeof resultSorts)[number]
/** `sort`: the web sends it only when it is not "best", so the API of the minutes before a deploy never refuses a search. */
export const resultsBody = z.strictObject({ form: formA, page: z.int().min(1).default(1), sort: z.enum(resultSorts).default('best') })

/** One card against a form, whatever the place types of the form: the label of the match box of a detail (PD3a). */
export const fitBody = z.strictObject({ form: formA, kind: z.enum(compareKinds), id: z.uuid() })
export type FitBody = z.infer<typeof fitBody>
/** False also when the card does not pass the filters of the form. */
export const fitResponse = z.object({ bestMatch: z.boolean() })

/** One filter that a suggested post relaxes: the next budget band, or a neighbouring area group (PD6c). */
const relaxed = z.discriminatedUnion('kind', [
  /** No maximum: the band "above 35k". */
  z.strictObject({ kind: z.literal('budget'), max: rupees.nullable() }),
  z.strictObject({ kind: z.literal('area'), area: areaSlug }),
])

/** The most notes in one "Roomsie Noticed" box, so that it stays about one screen high in the chat. */
export const maxNotices = 5

/** One note of "Roomsie Noticed" under the results of flow 02. The code counts each number; a note shows only when the data backs it. */
export const notice = z.discriminatedUnion('kind', [
  /** Only some of the results have a must-have that the search does not require. `near_station` names the walk to a station. */
  z.object({ kind: z.literal('mustHave'), key: z.enum(mustHaveKeys), count: z.int().min(1), total: z.int().min(2) }),
  /** People who look for flatmates in the areas of a search of places. */
  z.object({ kind: z.literal('teamUp'), count: z.int().min(1) }),
  /** The rents of the kinds of place in the areas, when the budget finds nothing. `low` and `high`: the middle half, from four places. */
  z.object({ kind: z.literal('rents'), cheapest: rupees, low: rupees.nullable(), high: rupees.nullable() }),
  /** A neighbouring area group that has results at this budget. */
  z.object({ kind: z.literal('nearbyArea'), area: areaSlug }),
  /** The rent of a 2 BHK in the areas, split two ways: the middle one, with its maintenance. */
  z.object({ kind: z.literal('share'), each: rupees, maintenanceIncluded: z.boolean() }),
])
export type Notice = z.infer<typeof notice>

export const resultsResponse = z.object({
  results: z.array(matchResult),
  total: z.int().min(0),
  page: z.int().min(1),
  /** Only when a search finds nothing: a few cards of each relaxed search. */
  suggestions: z.array(z.object({ relaxed, results: z.array(matchResult) })),
  /** Only on the first page. An older API sends none. */
  noticed: z.array(notice).max(maxNotices).default([]),
})
export type ResultsResponse = z.infer<typeof resultsResponse>
