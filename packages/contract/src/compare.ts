import { z } from 'zod'
import { listingResponse } from './listings'
import { cardResponse } from './profiles'
import { rupees } from './shared'

/** One kind of card for each comparison (T-49). */
export const compareKinds = ['place', 'person'] as const
export type CompareKind = (typeof compareKinds)[number]
export const maxCompared = 4

/**
 * The cards that the person selected for a question, in the order of the results, which the match query gives. One card
 * gets an answer about it; two cards or more also get the table of the comparison.
 */
export const compareRequest = z.strictObject({
  kind: z.enum(compareKinds),
  ids: z.array(z.uuid()).min(1).max(maxCompared).refine((ids) => new Set(ids).size === ids.length, 'Each card once'),
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

/** A short fact for a model: a name of a catalogue or of a station, with no more than 60 letters. */
const fact = z.string().min(1).max(60)
/**
 * The facts of a selected card that the advisor reads with a question about it (PD10). Code takes them from the fields of the
 * database and from our catalogues. Never a text that a lister or a person wrote: no description, no name of a PG, no bio and
 * no name of a person. `option`: the number of the card in the question, only with two cards or more, so that one card is "this place".
 */
export const placeFacts = z.strictObject({
  option: z.int().min(1).max(maxCompared).optional(),
  place: fact,
  area: fact.nullable(),
  nearestStation: fact.nullable(),
  walkToStation: fact.nullable(),
  rent: rupees,
  deposit: rupees.nullable(),
  maintenance: rupees.nullable(),
  brokerage: rupees.nullable(),
  moveInCash: rupees,
  availableFrom: z.iso.date().nullable(),
  furnishing: fact.nullable(),
  verified: z.boolean(),
})
export const personFacts = z.strictObject({
  option: z.int().min(1).max(maxCompared).optional(),
  age: z.int().nullable(),
  job: fact.nullable(),
  whosMoving: fact.nullable(),
  budget: fact.nullable(),
  moveDate: z.iso.date().nullable(),
  areas: z.array(fact).max(10),
  lifestyle: z.array(fact).max(8),
  verified: z.boolean(),
})
export const cardFacts = z.union([placeFacts, personFacts])
export type CardFacts = z.infer<typeof cardFacts>
