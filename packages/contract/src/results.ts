import { z } from 'zod'
import { listingResponse } from './listings'
import { cardResponse, mustHaveKeys } from './profiles'

const resultLabels = {
  /** The card meets all the preferences, and the searcher stated three or more. */
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
