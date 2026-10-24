import type { intentEnum } from '../db/schema'

export type Intent = (typeof intentEnum.enumValues)[number]

// PD3a: room, PG and whole-flat seekers see listings, not people.
export const INTENT_MATCHES: Record<Intent, readonly Intent[]> = {
  room: [],
  pg: [],
  whole_flat: [],
  flatmates: ['flatmates'],
  unclear: [],
}

export const compatibleIntents = (intent: Intent): readonly Intent[] => INTENT_MATCHES[intent]
