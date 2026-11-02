import { z } from 'zod'
import { formA } from './form-a'
import { intents, lifestyleAnswers, lifestyleAxes, mustHaveKeys, mustHaveWeights, roomTypes, whosMovingAnswers, type LifestyleAxis } from './profiles'
import { areaSlug, requiredText } from './shared'

/** A visitor sends this header in place of a sign-in token. Only the API makes the key, and it keeps only its hash (T-12). */
export const visitorKeyHeader = 'x-visitor-key'

/** Each slot of Form A that the assistant can fill or ask about. */
export const formASlots = [
  'intent', 'roomType', 'whosMoving', 'areas', 'budget', 'moveDate',
  ...lifestyleAxes.map((axis) => `lifestyle.${axis}` as const), ...mustHaveKeys.map((key) => `mustHaves.${key}` as const),
] as const
export type FormASlot = (typeof formASlots)[number]
export const slotPath = (slot: FormASlot) => slot.split('.') as [string, string | undefined]

export const chatTurn = z.object({ id: z.uuid(), role: z.enum(['user', 'assistant']), text: z.string(), createdAt: z.iso.datetime() })
export const goalResponse = z.object({ id: z.uuid(), form: formA, turns: z.array(chatTurn) })
export type GoalResponse = z.infer<typeof goalResponse>
/** `visitorKey` comes only when the API made a new visitor session. The browser keeps it. */
export const newGoalResponse = goalResponse.extend({ visitorKey: z.string().nullable() })
export const turnBody = z.strictObject({ text: requiredText(2000) })
/** The typed turn of the person and the reply of the assistant. */
export const turnResponse = z.object({ form: formA, turns: z.tuple([chatTurn, chatTurn]) })
export type TurnResponse = z.infer<typeof turnResponse>

/* The handlers of the assistant (PD7a). A change of a field gives the schema a new version. */

/** What the extractor reads: the typed turn and the last question of the assistant, never the full chat. */
export const extractorInput = z.strictObject({ version: z.literal(1).default(1), text: z.string(), lastQuestion: z.string().nullable() })
export type ExtractorInput = z.output<typeof extractorInput>

const choice = <V extends readonly [string, ...string[]]>(values: V) => z.enum(values).nullish()
const answer = <A extends LifestyleAxis>(axis: A) => z.enum([...lifestyleAnswers[axis], 'unclear']).nullish()
const words = z.string().trim().min(1).max(100)
/**
 * The answer of the model. A slot that the turn does not mention is null or absent.
 * Areas, budget and move date are the words of the person: code reads them (PD7).
 */
// Not strict, unlike the other handler schemas: a key that the model adds or misspells only leaves its slot empty,
// and the next question asks for it. A strict schema would refuse the whole answer, then retry and fall back (T-12 review).
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

/** A name of two or more areas, such as "Andheri". */
export const ambiguousArea = z.strictObject({ words: z.string(), slugs: z.array(areaSlug).min(2) })
export type AmbiguousArea = z.infer<typeof ambiguousArea>

/** A new value of a stated slot. The assistant asks which value to keep (PD3b). */
export const slotConflict = z.strictObject({ slot: z.enum(formASlots), earlier: z.unknown(), later: z.unknown() })
export type SlotConflict = z.infer<typeof slotConflict>

/** What the extractor gives. */
export const extractorOutput = z.strictObject({
  version: z.literal(1).default(1),
  form: formA,
  changed: z.array(z.enum(formASlots)),
  conflicts: z.array(slotConflict),
  /** The slots of the open conflicts that this turn settled, with a value or with "doosra wala". */
  settled: z.array(z.enum(formASlots)),
  /** Each name of two or more areas in the turn. The reply asks about each one. */
  ambiguous: z.array(ambiguousArea),
  /** No model gave an answer, so the form did not change. */
  failed: z.boolean(),
})
export type ExtractorOutput = z.output<typeof extractorOutput>

/** What an assistant turn keeps: the slot that it asked about, and if the question is a conflict of two values (PD3b). */
export const assistantParts = z.strictObject({
  version: z.literal(1).default(1),
  asked: z.strictObject({ slot: z.enum(formASlots), conflict: z.boolean() }).nullable(),
  /** The question of the reply, with no line before it. The extractor of the next turn reads it. */
  question: z.string().nullable().default(null),
  /** The conflicts that the reply asks about. They stay open until a turn settles them. */
  conflicts: z.array(slotConflict).default([]),
})
export type AssistantParts = z.infer<typeof assistantParts>

/** What the reply writer reads: the output of the extractor, and the question of the last reply. */
export const replyInput = extractorOutput.extend({ asked: assistantParts.shape.asked, lastQuestion: z.string().nullable(), openConflicts: z.array(slotConflict) })

/** What the reply writer gives: the text of the reply, and what the turn keeps. */
export const assistantReply = z.strictObject({ version: z.literal(1).default(1), text: z.string().min(1), parts: assistantParts })
export type AssistantReply = z.output<typeof assistantReply>
