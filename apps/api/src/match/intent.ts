import type { intentEnum } from '../db/schema'

/**
 * Which seeker intents see which people. Room, PG and whole-flat seekers see
 * listings, not people. `unclear` sees nobody until intent is known.
 * Provisional until F-12 decides the matrix (matching-rules.md).
 */
export type Intent = (typeof intentEnum.enumValues)[number]

export const INTENT_MATCHES: Record<Intent, readonly Intent[]> = {
  room: [],
  pg: [],
  whole_flat: [],
  flatmates: ['flatmates'],
  unclear: [],
}

export const compatibleIntents = (intent: Intent): readonly Intent[] => INTENT_MATCHES[intent]
