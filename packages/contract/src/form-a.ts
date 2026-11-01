import { z } from 'zod'
import { areaPicks, intents, lifestyleAnswers, mustHaveKeys, mustHaveWeights, roomTypes, whosMovingAnswers, type LifestyleAxis, type MustHaveKey } from './profiles'
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
})
export type FormA = z.infer<typeof formA>
