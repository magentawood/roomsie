import { z } from 'zod'
import { areaPicks, communities, intents, lifestyleAnswers, mustHaveKeys, mustHaveWeights, religions, roomTypes, whosMovingAnswers, type LifestyleAxis, type MustHaveKey } from './profiles'
import { rupees } from './shared'

/** No `inferred` source: the system never guesses a value (PD15). A slot that a stored form does not have reads as empty. */
const slot = <V extends z.ZodType>(value: V) => z.discriminatedUnion('source', [
  z.strictObject({ source: z.literal('empty'), value: z.null() }),
  z.strictObject({ source: z.enum(['stated', 'default']), value }),
]).default({ source: 'empty', value: null })

/** The chat adds `unclear` to the answers of the designs. The profile form does not (PD15). */
const answer = <A extends LifestyleAxis>(axis: A) => slot(z.enum([...lifestyleAnswers[axis], 'unclear']))
const weight = slot(z.enum([...mustHaveWeights, 'unclear']))
const lifestyle = {
  food: answer('food'), smoking: answer('smoking'), drinks: answer('drinks'), guests: answer('guests'),
  your_days: answer('your_days'), sleep: answer('sleep'), tidiness: answer('tidiness'), pets: answer('pets'),
} satisfies Record<LifestyleAxis, z.ZodType>
const mustHaves = Object.fromEntries(mustHaveKeys.map((key) => [key, weight])) as Record<MustHaveKey, typeof weight>

const budget = z.strictObject({ min: rupees.nullable(), max: rupees.nullable() })
  .refine((b) => b.min != null || b.max != null, 'A budget has a minimum or a maximum')
  .refine((b) => b.min == null || b.max == null || b.min <= b.max, 'The minimum is above the maximum')

/** A stated preference of the hidden filter: the values, and how strong (PD3c, T-58). An unclear weight acts as a preference. */
export const identityPreference = <L extends readonly [string, ...string[]]>(list: L) =>
  z.object({ values: z.array(z.enum(list)).min(1).max(list.length), weight: z.enum([...mustHaveWeights, 'unclear']) })
const religionPreference = identityPreference(religions).strict()
const communityPreference = identityPreference(communities).strict()
/** The hidden preferences that one typed turn stated: the log of PD3c (T-58). */
export const statedPreferences = z.strictObject({ religionPreference, communityPreference }).partial()
/** The two hidden slots of Form A. */
export type HiddenSlot = keyof z.infer<typeof statedPreferences>

/** What the assistant knows of one move. It drives the match query (PD7a, PD15). */
export const formA = z.strictObject({
  version: z.literal(1).default(1),
  intent: slot(z.enum(intents)),
  roomType: slot(z.enum(roomTypes)),
  whosMoving: slot(z.enum(whosMovingAnswers)),
  areas: slot(areaPicks.min(1)),
  budget: slot(budget),
  moveDate: slot(z.iso.date()),
  lifestyle: z.strictObject(lifestyle).prefault({}),
  mustHaves: z.strictObject(mustHaves).prefault({}),
  /** Hidden: no chip, question, label or results header shows them (PD3c, T-58). */
  religionPreference: slot(religionPreference),
  communityPreference: slot(communityPreference),
})
export type FormA = z.infer<typeof formA>
export type Budget = z.infer<typeof budget>

/** The budget bands of the chips (interface-shape.md). The band above 35k has no maximum. */
export const budgetBands = [
  { id: 'under_10k', min: null, max: 10_000 },
  { id: 'under_15k', min: null, max: 15_000 },
  { id: 'under_25k', min: null, max: 25_000 },
  { id: 'under_35k', min: null, max: 35_000 },
  { id: 'above_35k', min: 35_000, max: null },
] as const
