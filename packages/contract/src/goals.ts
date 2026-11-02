import { z } from 'zod'
import { budgetBandOf, budgetBands, chipSlots, formA, identityPreference, intentLabels, statedPreferences } from './form-a'
import { communities, intents, lifestyleAnswers, lifestyleAxes, mustHaveKeys, mustHaveWeights, ownValues, religions, roomTypes, whosMovingAnswers, type LifestyleAxis } from './profiles'
import { observation } from './form-b'
import { areaSlug, requiredText } from './shared'
import { waitlistPlace } from './waitlist'

/** A visitor sends this header in place of a sign-in token. Only the API makes the key, and it keeps only its hash (T-12). */
export const visitorKeyHeader = 'x-visitor-key'

/** Each slot of Form A that the assistant can fill or ask about. */
export const formASlots = [
  'intent', 'roomType', 'whosMoving', 'areas', 'budget', 'moveDate',
  ...lifestyleAxes.map((axis) => `lifestyle.${axis}` as const), ...mustHaveKeys.map((key) => `mustHaves.${key}` as const),
] as const
export type FormASlot = (typeof formASlots)[number]
export const slotPath = (slot: FormASlot) => slot.split('.') as [string, string | undefined]

// Vercel is live minutes before the API; the defaults read its old replies (api.md).
export const chatTurn = z.object({ id: z.uuid(), role: z.enum(['user', 'assistant']), text: z.string(), chips: z.enum(chipSlots).nullable().default(null), createdAt: z.iso.datetime() })
/** `typedTurnsLeft`: the typed turns of a visitor before the sign-in wall (PD9). Null: no count to show, for a signed-in person, or past the cap before results show. */
const typedTurnsLeft = z.number().int().min(0).nullable().default(null)
/** Each place outside Mumbai that any turn of the goal named, for the waitlist (PD6c). */
const outsidePlaces = z.array(waitlistPlace).default([])
export const goalResponse = z.object({ id: z.uuid(), form: formA, turns: z.array(chatTurn), typedTurnsLeft, outsidePlaces })
export type GoalResponse = z.infer<typeof goalResponse>
/** `visitorKey` comes only when the API made a new visitor session. The browser keeps it. */
export const newGoalResponse = goalResponse.extend({ visitorKey: z.string().nullable() })
export const chipTap = z.discriminatedUnion('slot', [
  z.strictObject({ slot: z.literal('intent'), value: z.enum(intents) }),
  z.strictObject({ slot: z.literal('areas'), value: z.array(areaSlug).min(1).max(10).refine((slugs) => new Set(slugs).size === slugs.length, 'Each area once') }),
  z.strictObject({ slot: z.literal('budget'), value: z.enum(budgetBands.map((band) => band.id)) }),
])
export type ChipTap = z.infer<typeof chipTap>
export const chipTurnParts = z.strictObject({ version: z.literal(1).default(1), tap: chipTap })
export type ChipTurnParts = z.output<typeof chipTurnParts>

export function tapText(tap: ChipTap, areaName: (slug: string) => string) {
  switch (tap.slot) {
    case 'intent': return intentLabels[tap.value]
    case 'areas': return tap.value.map(areaName).join(', ')
    case 'budget': return budgetBandOf(tap.value).label
  }
}
export const turnBody = z.union([z.strictObject({ text: requiredText(2000) }), z.strictObject({ tap: chipTap })])
export type TurnBody = z.infer<typeof turnBody>
/** The typed turn of the person and the reply of the assistant. */
export const turnResponse = z.object({ form: formA, turns: z.tuple([chatTurn, chatTurn]), typedTurnsLeft, outsidePlaces })

/** The limits of PD9 that refuse a turn or a new visitor chat (T-21). */
export const limitRefusal = z.object({ error: z.string(), limit: z.enum(['turn_cap', 'too_many_chats', 'too_fast']) })
export type LimitRefusal = z.infer<typeof limitRefusal>
/** The rate limits that the event `limit_hit` names. */
export const rateLimits = ['device', 'ip', 'ip_range', 'too_fast'] as const
export type RateLimit = (typeof rateLimits)[number]
/** The wall of the turn cap (drafts section 17). The API sends it as the text of the refusal. */
export const capWall = { title: 'Sign in to keep chatting', text: 'Your search and results stay.' } as const
export type TurnResponse = z.infer<typeof turnResponse>

/* The handlers of the assistant (PD7a). A change of a field gives the schema a new version. */

/** What the extractor reads: the typed turn and the last question of the assistant, never the full chat. */
export const extractorInput = z.strictObject({ version: z.literal(1).default(1), text: z.string(), lastQuestion: z.string().nullable() })

const choice = <V extends readonly [string, ...string[]]>(values: V) => z.enum(values).nullish()
const answer = <A extends LifestyleAxis>(axis: A) => z.enum([...lifestyleAnswers[axis], 'unclear']).nullish()
const words = z.string().trim().min(1).max(100)
/**
 * The answer of the model. A slot that the turn does not mention is null or absent.
 * Areas, budget and move date are the words of the person: code reads them (PD7).
 */
// Not strict: an unknown key from the model leaves its slot empty, and does not refuse the whole answer.
export const extractorAnswer = z.object({
  version: z.literal(2).default(2),
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
  religionPreference: identityPreference([...religions, 'unclear']).nullish(),
  communityPreference: identityPreference([...communities, 'unclear']).nullish(),
  ownReligion: choice([...religions, 'unclear']),
  ownCommunity: choice([...communities, 'unclear']),
})

/** A name of two or more areas, such as "Andheri". */
export const ambiguousArea = z.strictObject({ words: z.string(), slugs: z.array(areaSlug).min(2) })
export type AmbiguousArea = z.infer<typeof ambiguousArea>

/** A new value of a stated slot. The assistant asks which value to keep (PD3b). The `formA` parse of the extractor output is the only check of the two values. */
export const slotConflict = z.strictObject({ slot: z.enum(formASlots), earlier: z.unknown(), later: z.unknown() })
export type SlotConflict = z.infer<typeof slotConflict>

/** What the extractor gives. */
export const extractorOutput = z.strictObject({
  version: z.literal(2).default(2),
  form: formA,
  changed: z.array(z.enum(formASlots)),
  conflicts: z.array(slotConflict),
  /** The slots of the open conflicts that this turn settled, with a value or with "doosra wala". */
  settled: z.array(z.enum(formASlots)),
  /** Each name of two or more areas in the turn. The reply asks about each one. */
  ambiguous: z.array(ambiguousArea),
  /** No model gave an answer, so the form did not change. */
  failed: z.boolean(),
  /** What the person stated about themselves in this turn. Null: not in this turn. */
  ownValues,
  /** The hidden religion and community preferences that this turn stated (PD3c). */
  hiddenPreferences: statedPreferences,
  /** The places outside Mumbai where the person wants to live, from the place words of the turn. */
  outsidePlaces: z.array(waitlistPlace),
})
export type ExtractorOutput = z.output<typeof extractorOutput>

/** What an assistant turn keeps: the slot that it asked about, its question, and its open conflicts (PD3b). */
export const assistantParts = z.strictObject({
  version: z.literal(1).default(1),
  asked: z.strictObject({ slot: z.enum(formASlots) }).nullable(),
  /** The question of the reply, with no line before it. The extractor of the next turn reads it. */
  question: z.string().nullable().default(null),
  /** The conflicts that the reply asks about. They stay open until a turn settles them. */
  conflicts: z.array(slotConflict).default([]),
  /** The chips that the question offers: only with the plain question of intent, areas or budget (T-09). */
  chips: z.enum(chipSlots).nullable().default(null),
})
export type AssistantParts = z.infer<typeof assistantParts>

/** What a message is (PD7a). One message can be more than one kind. */
const routerKinds = ['filters', 'context', 'question'] as const
/** The scope bands of PD10. `general` and `consequential` are the bands 2a and 2b. */
export const scopeBands = ['core', 'general', 'consequential', 'out_of_scope', 'adversarial', 'sensitive'] as const
const register = z.strictObject({ language: z.enum(['english', 'hindi', 'marathi', 'mixed', 'other']), script: z.enum(['latin', 'devanagari', 'mixed']) })

/** What the router reads: the typed turn and the last question of the assistant, as the extractor. Each handler has its own schema (assistant.md). */
export const routerInput = z.strictObject({ version: z.literal(1).default(1), text: z.string(), lastQuestion: z.string().nullable() })
export type RouterInput = z.output<typeof routerInput>
/** The answer of the router model: the kinds, the band, the register for the reply writer (PD7), and two flags. Not strict, as the extractor answer. */
export const routerAnswer = z.object({
  version: z.literal(1).default(1),
  kinds: z.array(z.enum(routerKinds)).max(routerKinds.length),
  band: z.enum(scopeBands),
  register,
  /** The message tells of danger to the person or to others, such as self-harm or violence. */
  danger: z.boolean(),
  /** The message states a community or religion preference (PD3c). */
  community: z.boolean(),
})
export type RouterAnswer = z.output<typeof routerAnswer>

/**
 * The label of a typed turn, on the turn of the person. `band` is the band that the turn used, and `routerBand` the band of the router.
 * A band below the threshold makes the turn core, with no kinds and no flags. `routerBand` is null when no router answered.
 */
export const turnLabel = routerAnswer.extend({ routerBand: z.enum(scopeBands).nullable(), register: register.nullable() }).strict()
export type TurnLabel = z.output<typeof turnLabel>

/** What a typed turn keeps: the label of the router, and the hidden preferences that the turn stated, as the log of PD3c (T-58). */
export const userTurnParts = turnLabel.extend({ preferences: statedPreferences.optional() }).strict()
export type UserTurnParts = z.output<typeof userTurnParts>
/** A typed turn that states a hidden preference: the composer never reads it, so no reply names it (PD3c, T-58). */
export const statesHiddenPreference = ({ community, preferences }: Pick<UserTurnParts, 'community' | 'preferences'>) =>
  community || Object.keys(preferences ?? {}).length > 0

/** The languages of a reply (PD7, PC-09): English, Hinglish, Hindi, and Marathi in Latin and in Devanagari script. */
export const replyLanguages = ['en', 'hi-Latn', 'hi', 'mr-Latn', 'mr'] as const
export type ReplyLanguage = (typeof replyLanguages)[number]

/** What the reply writer reads: the output of the extractor, the question of the last reply, the label of the turn, and the language of the reply. */
// The reply never names the own values or the hidden preferences (T-58), so it does not read them. The web shows the outside places (T-22b).
export const replyInput = extractorOutput.omit({ ownValues: true, hiddenPreferences: true, outsidePlaces: true })
  .extend({ last: assistantParts.nullable(), label: turnLabel, language: z.enum(replyLanguages) })

/** What the reply writer gives: the text of the reply, and what the turn keeps. */
export const assistantReply = z.strictObject({ version: z.literal(1).default(1), text: z.string().min(1), parts: assistantParts })
export type AssistantReply = z.output<typeof assistantReply>

/** What the composer reads: the plan of the reply, the two forms of the person, and the last two turns, never the full chat (PD7a). */
export const composerInput = z.strictObject({
  version: z.literal(1).default(1),
  language: z.enum(replyLanguages),
  /** The scripted reply: the plan. */
  draft: z.string().min(1),
  /** The filled slots of Form A. */
  form: z.partialRecord(z.enum(formASlots), z.unknown()),
  formB: z.array(observation.pick({ key: true, value: true })),
  turns: z.array(z.strictObject({ role: z.enum(['user', 'assistant']), text: z.string() })).max(2),
  message: z.string(),
})
export type ComposerInput = z.output<typeof composerInput>
/** The answer of the composer model. Not strict, as the extractor answer. */
export const composerAnswer = z.object({ version: z.literal(1).default(1), text: z.string().min(1) })
/** What the composer gives: the words of the reply, after the output check. */
export const composerOutput = composerAnswer.strict()
