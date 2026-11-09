import { z } from 'zod'
import { areaPicks, communities, intents, lifestyleAnswerLabels, lifestyleAnswers, lifestyleAxes, mustHaveKeys, mustHaveWeights, religions, roomTypes, whosMovingAnswers, type LifestyleAxis, type MustHaveKey } from './profiles'
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

/** A place type of a goal: a kind of place, or people to rent a flat with (PD15). */
export type PlaceIntent = Exclude<(typeof intents)[number], 'unclear'>
/**
 * The place types of a goal: one or more kinds of place, or people alone, so a list of results has one kind of card.
 * "unclear" while the person is not sure. A form from before the list has one type, and it reads as a list of that type.
 */
const intentList = z.array(z.enum(intents).exclude(['unclear'])).min(1).max(3)
  .refine((list) => new Set(list).size === list.length, 'Each place type once')
  .refine((list) => list.length === 1 || !list.includes('flatmates'), 'People to rent with go alone')
// A codec, not a transform, so the API can also write the form in a response.
const intentValue = z.codec(z.union([z.enum(intents), intentList]), z.union([z.literal('unclear'), intentList]), {
  decode: (value) => (typeof value === 'string' && value !== 'unclear' ? [value] : value),
  encode: (value) => value,
})

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
  intent: slot(intentValue),
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
  { id: 'under_10k', min: null, max: 10_000, label: 'Under ₹10k' },
  { id: 'under_15k', min: null, max: 15_000, label: 'Under ₹15k' },
  { id: 'under_25k', min: null, max: 25_000, label: 'Under ₹25k' },
  { id: 'under_35k', min: null, max: 35_000, label: 'Under ₹35k' },
  { id: 'above_35k', min: 35_000, max: null, label: 'Above ₹35k' },
] as const
export type BudgetBand = (typeof budgetBands)[number]['id']
export const budgetBandId = z.enum(budgetBands.map((band) => band.id))
export const budgetBandOf = (id: BudgetBand) => budgetBands.find((band) => band.id === id)!

/** The state of one slot, as each slot of Form A has it. */
export type SlotState = { source: 'empty' | 'stated' | 'default'; value: unknown }
/** A slot that the assistant still asks about. */
export const isOpenSlot = ({ source, value }: SlotState) => source === 'empty' || value === 'unclear'
/** The place types of a form. None while the slot is empty or unclear. */
export const intentsOf = (form: FormA): PlaceIntent[] => (Array.isArray(form.intent.value) ? form.intent.value : [])
/** Adds a place type to a list: kinds of place add up, and people to rent with replace them or are replaced. */
export const withIntent = (current: readonly PlaceIntent[], added: PlaceIntent): PlaceIntent[] =>
  added === 'flatmates' || current.includes('flatmates') ? [added] : current.includes(added) ? [...current] : [...current, added]

/** Results show when intent, areas and budget have values: the panel of the web, and the turn cap of PD9 (T-21). */
export const panelReady = (form: FormA) => [form.intent, form.areas, form.budget].every((slot) => !isOpenSlot(slot))

/** Each slot of Form A that the assistant can fill or ask about. */
export const formASlots = [
  'intent', 'roomType', 'whosMoving', 'areas', 'budget', 'moveDate',
  ...lifestyleAxes.map((axis) => `lifestyle.${axis}` as const), ...mustHaveKeys.map((key) => `mustHaves.${key}` as const),
] as const
export type FormASlot = (typeof formASlots)[number]
export const slotPath = (slot: FormASlot) => slot.split('.') as [string, string | undefined]
export function slotOf(form: FormA, slot: FormASlot): SlotState {
  const [group, key] = slotPath(slot)
  const record = form as unknown as Record<string, Record<string, SlotState>>
  return (key ? record[group]![key] : record[group]) as SlotState
}
/** The slots with a value, by slot, as `lifestyle.food`. The hidden slots are not in the list. */
export const filledSlots = (form: FormA) => Object.fromEntries(formASlots.flatMap((slot) => {
  const { source, value } = slotOf(form, slot)
  return source === 'empty' ? [] : [[slot, value]]
}))

/** The closed questions, with chips (T-09, T-59). The hidden slots and the move date have none (PD15). */
export const chipSlots = formASlots.filter((slot): slot is Exclude<FormASlot, 'moveDate'> => slot !== 'moveDate')
export type ChipSlot = (typeof chipSlots)[number]
/** Intent, areas and budget have chips of their own: the help line, several picks, and the bands. */
export type AnswerChipSlot = Exclude<ChipSlot, 'intent' | 'areas' | 'budget'>
/** The chip words of room type, who is moving and the weight of a must-have (the drafts, section 35). */
const roomTypeChipLabels = { private: 'A private room', shared: 'A shared room' } satisfies Record<Exclude<(typeof roomTypes)[number], 'unclear'>, string>
const whosMovingChipLabels = {
  student: 'Student', first_job: 'First job', working: 'Working', couple: 'Couple', family: 'Family', friends: 'Group of friends',
} satisfies Record<Exclude<(typeof whosMovingAnswers)[number], 'unclear'>, string>
const weightChipLabels = { dealbreaker: "It's a must", prefer: 'Show them first' } satisfies Record<(typeof mustHaveWeights)[number], string>

/** The labels of the answers of a chip slot, by value, in the order of their chips. */
export function chipLabels(slot: AnswerChipSlot): Record<string, string> {
  const [group, key] = slotPath(slot)
  return group === 'roomType' ? roomTypeChipLabels : group === 'whosMoving' ? whosMovingChipLabels
    : group === 'lifestyle' ? lifestyleAnswerLabels[key as LifestyleAxis] : weightChipLabels
}
/** The place-type chips, as the designs name them (PD15). */
export const intentLabels = {
  room: 'A room in a shared flat', pg: 'A PG or hostel', whole_flat: 'A whole flat', flatmates: 'People to rent with', unclear: 'Not sure, help me pick',
} satisfies Record<(typeof intents)[number], string>
