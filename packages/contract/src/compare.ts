import { z } from 'zod'
import { furnishings, minStays, walkTimes } from './listings'
import { cardResponse } from './profiles'
import { rupees } from './shared'

/** One kind of card for each comparison (T-49). */
export const compareKinds = ['place', 'person'] as const
export type CompareKind = (typeof compareKinds)[number]
export const maxCompared = 4

/** The cards of a comparison, in the order of the results, which the match query gives. */
export const compareRequest = z.strictObject({
  kind: z.enum(compareKinds),
  ids: z.array(z.uuid()).min(2).max(maxCompared).refine((ids) => new Set(ids).size === ids.length, 'Each card once'),
})
export type CompareRequest = z.infer<typeof compareRequest>

/** A place: its database fields, and the cash to move in, which the API adds up. A PG gives its lowest rent. */
const placeOption = z.object({
  id: z.uuid(),
  title: z.string(),
  rent: rupees,
  deposit: rupees.nullable(),
  moveInCash: rupees,
  maintenance: rupees.nullable(),
  brokerage: rupees.nullable(),
  nearestStation: z.string().nullable(),
  walkStation: z.enum(walkTimes).nullable(),
  availableFrom: z.iso.date().nullable(),
  minStay: z.enum(minStays).nullable(),
  furnishing: z.enum(furnishings).nullable(),
  verified: z.boolean(),
})
/** A person: only what the card shows to others (PD16), never the hidden religion or community (PD3c), and never the bio. */
const personOption = cardResponse.pick({ id: true, fullName: true, age: true, jobRole: true, whosMoving: true, budgetMin: true, budgetMax: true, moveDate: true, lifestyle: true, verified: true })

/** The table of a comparison, which code builds from the database (scope-policy.md). The turn keeps the values of its time. */
export const comparison = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('place'), options: z.array(placeOption).min(2).max(maxCompared) }),
  z.object({ kind: z.literal('person'), options: z.array(personOption).min(2).max(maxCompared) }),
])
export type Comparison = z.infer<typeof comparison>
