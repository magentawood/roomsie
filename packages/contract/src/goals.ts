import { z } from 'zod'
import { formA } from './form-a'
import { intents, lifestyleAnswers, mustHaveKeys, mustHaveWeights, roomTypes, whosMovingAnswers, type LifestyleAxis } from './profiles'
import { areaSlug, requiredText } from './shared'

/** A visitor sends this header in place of a sign-in token. Only the API makes the key, and it keeps only its hash (T-12). */
export const visitorKeyHeader = 'x-visitor-key'
export const maxTurnLength = 2000

const lifestyleAxes = Object.keys(lifestyleAnswers) as LifestyleAxis[]
/** Each slot of Form A that the assistant can fill or ask about. */
export const formASlots = [
  'intent', 'roomType', 'whosMoving', 'areas', 'budget', 'moveDate',
  ...lifestyleAxes.map((axis) => `lifestyle.${axis}` as const), ...mustHaveKeys.map((key) => `mustHaves.${key}` as const),
] as const
export type FormASlot = (typeof formASlots)[number]

export const chatTurn = z.object({ id: z.uuid(), role: z.enum(['user', 'assistant']), text: z.string(), createdAt: z.iso.datetime() })
export const goalResponse = z.object({ id: z.uuid(), form: formA, turns: z.array(chatTurn) })
export type GoalResponse = z.infer<typeof goalResponse>
/** `visitorKey` comes only when the API made a new visitor session. The browser keeps it. */
export const newGoalResponse = goalResponse.extend({ visitorKey: z.string().nullable() })
export const turnBody = z.strictObject({ text: requiredText(maxTurnLength) })
/** The typed turn of the person and the reply of the assistant. */
export const turnResponse = z.object({ form: formA, turns: z.tuple([chatTurn, chatTurn]) })
export type TurnResponse = z.infer<typeof turnResponse>

/* The handlers of the assistant (PD7a). A change of a field gives the schema a new version. */

/** What the extractor reads: the typed turn and the last question of the assistant, never the full chat. */
export const extractorInput = z.object({ version: z.literal(1).default(1), text: z.string(), lastQuestion: z.string().nullable() })

const choice = <V extends readonly [string, ...string[]]>(values: V) => z.enum(values).nullish()
const answer = <A extends LifestyleAxis>(axis: A) => z.enum([...lifestyleAnswers[axis], 'unclear']).nullish()
const words = z.string().trim().min(1).max(100)
/**
 * The answer of the model. A slot that the turn does not mention is null or absent.
 * Areas, budget and move date are the words of the person: code reads them (PD7).
 */
export const extractorAnswer = z.object({
  version: z.literal(1).default(1),
  intent: choice(intents),
  roomType: choice(roomTypes),
  whosMoving: choice(whosMovingAnswers),
  areas: z.array(z.object({ words, slug: areaSlug.nullable() })).max(20).nullish(),
  budget: words.nullish(),
  moveDate: words.nullish(),
  lifestyle: z.object({
    food: answer('food'), smoking: answer('smoking'), drinks: answer('drinks'), guests: answer('guests'),
    your_days: answer('your_days'), sleep: answer('sleep'), tidiness: answer('tidiness'), pets: answer('pets'),
  } satisfies Record<LifestyleAxis, z.ZodType>).nullish(),
  mustHaves: z.partialRecord(z.enum(mustHaveKeys), choice([...mustHaveWeights, 'unclear'])).nullish(),
})
export type ExtractorAnswer = z.infer<typeof extractorAnswer>

/** What an assistant turn keeps: the slot that it asked about, and if the question is a conflict of two values (PD3b). */
export const assistantParts = z.object({
  version: z.literal(1).default(1),
  asked: z.object({ slot: z.enum(formASlots), conflict: z.boolean() }).nullable(),
})
export type AssistantParts = z.infer<typeof assistantParts>
