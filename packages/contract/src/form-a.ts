import { z } from 'zod'
import { areaPicks, intents, lifestyleAnswers, mustHaveKeys, mustHaveWeights, roomTypes, whosMovingAnswers, type LifestyleAxis, type MustHaveKey } from './profiles'
import { rupees } from './shared'

/** No `inferred`: the system never guesses a slot value (PD15). */
export const formASources = ['stated', 'default', 'empty'] as const
export type FormASource = (typeof formASources)[number]

/** A slot of Form A. A slot that a stored form does not have reads as empty. */
const slot = <V extends z.ZodType>(value: V) => z.discriminatedUnion('source', [
  z.object({ source: z.literal('empty'), value: z.null() }),
  z.object({ source: z.enum(['stated', 'default']), value }),
]).default({ source: 'empty', value: null })

/** The chat adds `unclear` to the answers of the designs. The profile form does not (PD15). */
const answer = <A extends LifestyleAxis>(axis: A) => slot(z.enum([...lifestyleAnswers[axis], 'unclear']))
/** An unclear weight does not filter and does not rank (PD15). */
const weight = slot(z.enum([...mustHaveWeights, 'unclear']))

const budget = z.object({ min: rupees.nullable(), max: rupees.nullable() })
  .refine((b) => b.min != null || b.max != null, 'A budget has a minimum or a maximum')
  .refine((b) => b.min == null || b.max == null || b.min <= b.max, 'The minimum is above the maximum')

/** What the assistant knows of one move. It drives the match query (PD7a, PD15). */
export const formA = z.object({
  intent: slot(z.enum(intents)),
  roomType: slot(z.enum(roomTypes)),
  whosMoving: slot(z.enum(whosMovingAnswers)),
  areas: slot(areaPicks.min(1)),
  budget: slot(budget),
  moveDate: slot(z.iso.date()),
  lifestyle: z.object({
    food: answer('food'), smoking: answer('smoking'), drinks: answer('drinks'), guests: answer('guests'),
    your_days: answer('your_days'), sleep: answer('sleep'), tidiness: answer('tidiness'), pets: answer('pets'),
  }).prefault({}),
  mustHaves: z.object(Object.fromEntries(mustHaveKeys.map((key) => [key, weight])) as Record<MustHaveKey, typeof weight>).prefault({}),
})
export type FormA = z.infer<typeof formA>
