import { z } from 'zod'
import { budgetBandId, budgetBandOf, chipLabels, chipSlots, formA, type FormA, formASlots, identityPreference, intentLabels, intentsOf, type PlaceIntent, statedPreferences } from './form-a'
import { communities, intents, lifestyleAnswers, lifestyleAxes, mustHaveKeys, mustHaveWeights, ownValues, religions, roomTypes, whosMovingAnswers, type LifestyleAxis } from './profiles'
import { cardFacts, comparison, compareRequest, maxCompared } from './compare'
import { maxTrips, tripFacts, trips } from './trips'
import { observation } from './form-b'
import { areaSlug, requiredText } from './shared'
import { waitlistPlace } from './waitlist'

/** A visitor sends this header in place of a sign-in token. Only the API makes the key, and it keeps only its hash (T-12). */
export const visitorKeyHeader = 'x-visitor-key'

// Vercel is live minutes before the API; the defaults read its old replies (api.md).
export const chatTurn = z.object({
  id: z.uuid(), role: z.enum(['user', 'assistant']), text: z.string(),
  chips: z.enum(chipSlots).nullable().default(null).catch(null), // A chip slot of a newer API reads as no chips.
  comparison: comparison.nullable().default(null),
  notes: z.boolean().default(false),
  /** The trips that the reply measured, for the map in the chat. A shape of a newer API reads as no trips. */
  trips: trips.default([]).catch([]),
  /** The question "Same move?": the title of the other goal, for the chip "Same move: continue in …". */
  sameMove: z.object({ title: z.string() }).nullable().default(null).catch(null),
  createdAt: z.iso.datetime(),
})
/** `typedTurnsLeft`: the typed turns of a visitor before the sign-in wall (PD9). Null: no count to show, for a signed-in person, or past the cap before results show. */
const typedTurnsLeft = z.number().int().min(0).nullable().default(null)
/** Each place outside Mumbai that any turn of the goal named, for the waitlist (PD6c). */
const outsidePlaces = z.array(waitlistPlace).default([])
/** A goal closes when the person found a place or dropped the plan, and a reopen opens it again (T-50). */
export const goalStatuses = ['open', 'closed'] as const
export const goalStatus = z.enum(goalStatuses)
export type GoalStatus = z.infer<typeof goalStatus>
/** The title of a goal with no area yet (T-50). */
export const newGoalTitle = 'New goal'
/** The title that the API builds with `goalTitle`. */
const title = z.string().default(newGoalTitle)
export const goalResponse = z.object({ id: z.uuid(), form: formA, turns: z.array(chatTurn), typedTurnsLeft, outsidePlaces, status: goalStatus.default('open'), title })
export type GoalResponse = z.infer<typeof goalResponse>
/** `visitorKey` comes only when the API made a new visitor session. The browser keeps it. */
export const newGoalResponse = goalResponse.extend({ visitorKey: z.string().nullable() })
export const chipTap = z.discriminatedUnion('slot', [
  /** `also`: "Show some PGs too" adds a kind of place, and a plain tap replaces the list. */
  z.strictObject({ slot: z.literal('intent'), value: z.enum(intents), also: z.literal(true).optional() })
    .refine((tap) => !tap.also || (tap.value !== 'flatmates' && tap.value !== 'unclear'), 'Only a kind of place adds'),
  z.strictObject({ slot: z.literal('areas'), value: z.array(areaSlug).min(1).max(10).refine((slugs) => new Set(slugs).size === slugs.length, 'Each area once') }),
  z.strictObject({ slot: z.literal('budget'), value: budgetBandId }),
  z.strictObject({ slot: z.literal('roomType'), value: z.enum(roomTypes).exclude(['unclear']) }),
  z.strictObject({ slot: z.literal('whosMoving'), value: z.enum(whosMovingAnswers).exclude(['unclear']) }),
  ...lifestyleAxes.map((axis) => z.strictObject({ slot: z.literal(`lifestyle.${axis}`), value: z.enum(lifestyleAnswers[axis]) })),
  ...mustHaveKeys.map((key) => z.strictObject({ slot: z.literal(`mustHaves.${key}`), value: z.enum(mustHaveWeights) })),
])
export type ChipTap = z.infer<typeof chipTap>
/** The answers of the onboarding of flow 01 that start a goal, with the values of the chips. Each step can be skipped (T-48). */
export const goalStart = z.strictObject({
  intent: z.enum(intents).optional(),
  whosMoving: z.enum(whosMovingAnswers).exclude(['unclear']).optional(),
  area: areaSlug.optional(),
  /** Two area groups or more. One group comes as `area`, which an older API also takes. */
  areas: z.array(areaSlug).min(2).max(10).refine((slugs) => new Set(slugs).size === slugs.length, 'Each area once').optional(),
  budget: budgetBandId.optional(),
  /** The must-haves of a flatmate search: each one is a dealbreaker. */
  mustHaves: z.array(z.enum(mustHaveKeys)).max(mustHaveKeys.length).refine((keys) => new Set(keys).size === keys.length, 'Each must-have once').optional(),
}).refine((start) => !(start.area && start.areas), 'One area as area, or more as areas')
export type GoalStart = z.infer<typeof goalStart>
export const chipTurnParts = z.strictObject({ version: z.literal(1).default(1), tap: chipTap })
export type ChipTurnParts = z.output<typeof chipTurnParts>

/** The follow-up chips of flow 02 that add a place type. */
export const alsoLabels = { room: 'Show some rooms too', pg: 'Show some PGs too', whole_flat: 'Show me some flats as well' } satisfies Record<Exclude<PlaceIntent, 'flatmates'>, string>

export function tapText(tap: ChipTap, areaName: (slug: string) => string) {
  switch (tap.slot) {
    case 'intent': return tap.also ? alsoLabels[tap.value as keyof typeof alsoLabels] : intentLabels[tap.value]
    case 'areas': return tap.value.map(areaName).join(', ')
    case 'budget': return budgetBandOf(tap.value).label
    default: return chipLabels(tap.slot)[tap.value]!
  }
}
/**
 * `compare`: the cards that the person selected. `shown`: with no selection, the cards on the screen of the person: the card open
 * in the results panel, or the first results. The API gives a question about them their facts (PD10).
 */
export const turnBody = z.union([z.strictObject({ text: requiredText(2000), compare: compareRequest.optional(), shown: compareRequest.optional() }), z.strictObject({ tap: chipTap })])

/** The two answers of "Same move?" (Figma 67:6489). */
export const sameMoveAnswer = z.enum(['same', 'separate'])
export type SameMoveAnswer = z.infer<typeof sameMoveAnswer>
/** The words of the two chips. The first names the other goal. */
export const sameMoveLabels = { same: (title: string) => `Same move: continue in ${title}`, separate: "No, it's a separate move" } as const
export const sameMoveBody = z.strictObject({ answer: sameMoveAnswer })
/** The turn of the person that answers "Same move?". It is a chip, so it is not one of the typed turns of the cap (PD9). */
export const sameMoveTurnParts = z.strictObject({ version: z.literal(1).default(1), sameMove: sameMoveAnswer })
export type SameMoveTurnParts = z.output<typeof sameMoveTurnParts>
export type TurnBody = z.infer<typeof turnBody>
/** The typed turn of the person and the reply of the assistant. */
export const turnResponse = z.object({ form: formA, turns: z.tuple([chatTurn, chatTurn]), typedTurnsLeft, outsidePlaces, title })
/**
 * The answer to "Same move?". `goalId`: the goal that has the new turns. After "Same move", it is the other goal, and the new goal is gone.
 * The turns: the held message and the reply, or only the reply when the answers of the onboarding were held.
 */
export const sameMoveResponse = z.object({ goalId: z.uuid(), form: formA, turns: z.array(chatTurn).min(1).max(2), typedTurnsLeft, outsidePlaces, title })
export type SameMoveResponse = z.infer<typeof sameMoveResponse>

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
  version: z.literal(4).default(4),
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
  /** The answer named an own religion or community, also an unsure one: the observer then writes no note (PD3c, T-36). */
  mentionsOwnValue: z.boolean(),
  /** The hidden religion and community preferences that this turn stated (PD3c). */
  hiddenPreferences: statedPreferences,
  /** The places outside Mumbai where the person wants to live, from the place words of the turn (T-22a). */
  outsidePlaces: z.array(waitlistPlace),
})
export type ExtractorOutput = z.output<typeof extractorOutput>

/**
 * A first message, or the answers of the onboarding, that wait for the answer to "Same move?". Code applies the values to the goal
 * that the person picks, with no model call, so the held message changes neither goal until then.
 */
export const heldMove = z.strictObject({
  version: z.literal(1).default(1),
  /** The other open goal that looks like the same move, and its title when the question came. */
  goalId: z.uuid(),
  title: z.string(),
  /** The values of the held message by slot of Form A, after the gate and the parsers. */
  values: z.partialRecord(z.enum(formASlots), z.unknown()),
  ambiguous: z.array(ambiguousArea).default([]),
  outsidePlaces: z.array(waitlistPlace).default([]),
  /** True: the held message is the first typed turn of the goal. False: the answers of the onboarding, with no turn of the person. */
  typed: z.boolean(),
})
export type HeldMove = z.output<typeof heldMove>

/** What an assistant turn keeps: the slot that it asked about, its question, and its open conflicts (PD3b). */
export const assistantParts = z.strictObject({
  version: z.literal(1).default(1),
  asked: z.strictObject({ slot: z.enum(formASlots) }).nullable(),
  /** The question of the reply, with no line before it. The extractor of the next turn reads it. */
  question: z.string().nullable().default(null),
  /** The conflicts that the reply asks about. They stay open until a turn settles them. */
  conflicts: z.array(slotConflict).default([]),
  /** The chips that the question offers: with the plain question of a closed slot, and with the weight question (T-09, T-59). */
  chips: z.enum(chipSlots).nullable().default(null),
  comparison: comparison.nullable().default(null),
  /** The reply shows the notes of the owner. It keeps no copy, so a deleted note leaves no words in the chat (T-36). */
  notes: z.boolean().default(false),
  /** The reply has the notes hint, which each owner gets one time (T-36). */
  notesHint: z.boolean().default(false),
  /** The reply asks "Same move?", and holds the message until the answer. */
  held: heldMove.nullable().default(null),
  /** The trips that the reply measured, for its map (the founders, 2026-11-11). */
  trips: trips.default([]),
})
export type AssistantParts = z.infer<typeof assistantParts>

/** What a message is (PD7a). One message can be more than one kind. */
const routerKinds = ['filters', 'context', 'question'] as const
/** The scope bands of PD10. `general` and `consequential` are the bands 2a and 2b. */
export const scopeBands = ['core', 'general', 'consequential', 'out_of_scope', 'adversarial', 'sensitive'] as const
export type ScopeBand = (typeof scopeBands)[number]
const register = z.strictObject({ language: z.enum(['english', 'hindi', 'marathi', 'mixed', 'other']), script: z.enum(['latin', 'devanagari', 'mixed']) })

/** What the router reads: the typed turn and the last question of the assistant, as the extractor. Each handler has its own schema (assistant.md). */
export const routerInput = z.strictObject({ version: z.literal(1).default(1), text: z.string(), lastQuestion: z.string().nullable() })
export type RouterInput = z.output<typeof routerInput>
/** The answer of the router model: the kinds, the band, the register for the reply writer (PD7), and its flags. Not strict, as the extractor answer. */
export const routerAnswer = z.object({
  version: z.literal(1).default(1),
  kinds: z.array(z.enum(routerKinds)).max(routerKinds.length),
  band: z.enum(scopeBands),
  register,
  /** The message tells of danger to the person or to others, such as self-harm or violence. */
  danger: z.boolean(),
  /** The message states a community or religion preference (PD3c). */
  community: z.boolean(),
  /** The person asks what the assistant noted about them (PD7a). A label of an older turn has no flag. */
  notes: z.boolean().default(false),
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
export const replyInput = extractorOutput.omit({ ownValues: true, mentionsOwnValue: true, hiddenPreferences: true, outsidePlaces: true })
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

/** What the advisor reads: a general question of band 2a and the language of the reply. Never Form A, Form B or the chat (PD7a, PD10). */
/** `cards`: with a question about the cards that the person selected, or about the cards on the screen (`cardsAre`), as their facts (PD10). */
export const advisorInput = z.strictObject({
  version: z.literal(1).default(1), language: z.enum(replyLanguages), question: z.string().min(1),
  cards: z.array(cardFacts).min(1).max(maxCompared).optional(), cardsAre: z.enum(['selected', 'shown']).optional(),
  trips: z.array(tripFacts).min(1).max(maxTrips).optional(),
})
export type AdvisorInput = z.output<typeof advisorInput>
/** The answer of the advisor model. An empty text: no general answer, so the line "I've noted it" goes out. Not strict, as the extractor answer. */
export const advisorAnswer = z.object({ version: z.literal(1).default(1), text: z.string() })

const titleLeads = {
  room: 'Room hunting in', pg: 'PG hunting in', whole_flat: 'Flat hunting in', flatmates: 'Teaming up to rent around', unclear: 'Looking in',
} satisfies Record<(typeof intents)[number], string>

/** The title of a goal, from its place type and its first area, as the designs name a goal. Several kinds of place are a place hunt. */
export function goalTitle(form: FormA, areaName: (slug: string) => string) {
  const area = Array.isArray(form.areas.value) ? form.areas.value[0] : undefined
  const types = intentsOf(form)
  const lead = types.length > 1 ? 'Place hunting in' : titleLeads[types[0] ?? 'unclear']
  return area ? `${lead} ${areaName(area)}` : newGoalTitle
}

/** `updatedAt`: the last turn or change of the goal. An older API sends none. */
export const goalsResponse = z.object({
  goals: z.array(z.object({ id: z.uuid(), title: z.string(), status: goalStatus, createdAt: z.iso.datetime(), updatedAt: z.iso.datetime().nullable().default(null) })),
})
export type GoalsResponse = z.infer<typeof goalsResponse>
/** The answer of the pop-up "Where did you find it?". Only the event keeps it. */
export const closeAnswer = z.enum(['roomsie', 'elsewhere', 'dropped'])
export type CloseAnswer = z.infer<typeof closeAnswer>
export const closeGoalBody = z.strictObject({ where: closeAnswer })
/** `askFeedback`: the goal has no feedback yet, so the web shows the feedback pop-up. */
export const closeGoalResponse = z.object({ askFeedback: z.boolean() })
