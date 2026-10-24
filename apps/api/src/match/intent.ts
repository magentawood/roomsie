/**
 * Which seeker intents see which people (PD15).
 *
 * A seeker who wants a room, a PG or a whole flat sees listings, not person
 * cards, so those intents match no people. Two seekers who want people to
 * rent with match each other. `unclear` matches nobody: intent is one of the
 * slots needed before results appear (interface-shape.md, hole 3).
 *
 * Provisional until F-12 decides the matrix (matching-rules.md).
 */
export const INTENT_MATCHES = {
  room: [],
  pg: [],
  whole_flat: [],
  flatmates: ['flatmates'],
  unclear: [],
} as const satisfies Record<string, readonly string[]>

export type Intent = keyof typeof INTENT_MATCHES

export const compatibleIntents = (intent: Intent): readonly Intent[] => INTENT_MATCHES[intent]
