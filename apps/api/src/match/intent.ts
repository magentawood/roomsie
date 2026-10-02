/**
 * Which intents can match which.
 *
 * roomsie serves both sides of the market at once, so "who should I see?"
 * is not symmetric. Someone with a spare room and someone looking for a
 * room are a match; two people each holding a flat are not.
 *
 *   has_flat    has a flat, wants flatmates      → wants_room, open
 *   wants_room  wants a room in an occupied flat → has_flat,   open
 *   wants_flat  wants a whole flat               → wants_flat, open
 *               (two seekers teaming up to rent a place together)
 *   open        either way                       → everyone
 *   unclear     the assistant does not know yet  → nobody; no results
 *
 * `unclear` matching nobody is deliberate. Intent is one of the three slots
 * required before results appear at all (interface-shape.md, hole 3), so an
 * unclear intent means we should not be querying yet.
 */
export const INTENT_MATCHES = {
  has_flat: ['wants_room', 'open'],
  wants_room: ['has_flat', 'open'],
  wants_flat: ['wants_flat', 'open'],
  open: ['has_flat', 'wants_flat', 'wants_room', 'open'],
  unclear: [],
} as const satisfies Record<string, readonly string[]>

export type Intent = keyof typeof INTENT_MATCHES

export const compatibleIntents = (intent: Intent): readonly Intent[] => INTENT_MATCHES[intent]
