import { z } from 'zod'
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
export const resultsBody = z.strictObject({ form: formA, page: z.int().min(1).default(1) })

/** One filter that a suggested post relaxes: the next budget band, or a neighbouring area group (PD6c). */
const relaxed = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('budget'), max: rupees }),
  z.strictObject({ kind: z.literal('area'), area: areaSlug }),
])

export const resultsResponse = z.object({
  results: z.array(matchResult),
  total: z.int().min(0),
  page: z.int().min(1),
  /** Only when a search finds nothing: a few cards of each relaxed search. */
  suggestions: z.array(z.object({ relaxed, results: z.array(matchResult) })),
})
export type ResultsResponse = z.infer<typeof resultsResponse>
