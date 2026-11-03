import { z } from 'zod'
import { listingResponse } from './listings'
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

/** A place: its database fields, and the cash to move in (`moveInOf`). */
const placeOption = z.strictObject({
  ...listingResponse.pick({ id: true, maintenance: true, brokerage: true, nearestStation: true, walkStation: true, availableFrom: true, minStay: true, furnishing: true, verified: true }).shape,
  title: z.string(),
  rent: rupees,
  deposit: rupees.nullable(),
  moveInCash: rupees,
})
/** A person: only what the card shows to others (PD16), never the hidden religion or community (PD3c), and never the bio. */
const personOption = z.strictObject(cardResponse.pick({ id: true, fullName: true, age: true, jobRole: true, whosMoving: true, budgetMin: true, budgetMax: true, moveDate: true, lifestyle: true, verified: true }).shape)

/** The table of a comparison, which code builds from the database (scope-policy.md). Strict, so no other field of a card can go in. */
export const comparison = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('place'), options: z.array(placeOption).min(2).max(maxCompared) }),
  z.strictObject({ kind: z.literal('person'), options: z.array(personOption).min(2).max(maxCompared) }),
])
export type Comparison = z.infer<typeof comparison>
export type PersonOption = z.infer<typeof personOption>

/** A person with only a name, in a comparison that another person keeps: after an account deletion (PD19) or a block. */
export const goneFromComparison = (id: string, fullName: 'Deleted user' | 'Not available'): PersonOption =>
  ({ id, fullName, age: null, jobRole: null, whosMoving: 'unclear', budgetMin: null, budgetMax: null, moveDate: null, lifestyle: {}, verified: false })
