import type { FastifyRequest } from 'fastify'
import {
  assistantParts, budgetBandOf, filledSlots, formA, formASlots, intentsOf, isOpenSlot, slotOf, withIntent, statesHiddenPreference, tapText,
  factsOfTrip, maxTrips, type AssistantParts, type CardFacts, type Comparison, type AssistantReply, type Trip, type ChipTap, type ComposerInput, type ReplyLanguage, type ExtractorOutput, type FormA, type TurnLabel, type GoalStart, type FormASlot, type HeldMove,
} from '@roomsie/contract'
import type { Db } from '../db/client'
import type { Models } from '../models/models'
import { catalogueOf, type Catalogue } from './catalogue'
import { asksDistance, looksLikeQuestion, placesIn, tripBetween, type Spot } from '../geo/geo'
import { advisor } from './handlers/advisor/advisor'
import { composer } from './handlers/composer/composer'
import { extractor, noExtraction } from './handlers/extractor/extractor'
import { locate } from './handlers/locator/locator'
import { applyValues, withSlot, type SlotValues } from './handlers/extractor/form-update'
import { replyWriter } from './handlers/reply/reply'
import { rupees } from './handlers/reply/texts'
import { routeTurn } from './handlers/router/router'
import { cheapestLine, languageOf, lineOf } from './lines'
import { genderIn } from './words'
import type { AssistantSettings } from './settings'

export type AssistantDeps = { req: FastifyRequest; db: Db; models?: Models; settings: AssistantSettings; today: () => string }

export type TurnState = {
  goalId: string
  text: string
  /** The last reply of the assistant: its question, the slot that it asked about, and its open conflicts. */
  last: AssistantParts | null
  /** The register of the last typed turn: the language of a tap, and of a turn with no label (T-13). */
  lastRegister: TurnLabel['register']
  form: FormA
} & Omit<ExtractorOutput, 'version' | 'form'>

/** An off-topic or adversarial turn is not about the search (PD10, T-34). */
const aboutTheSearch = ({ band }: TurnLabel) => band !== 'out_of_scope' && band !== 'adversarial'
const onlyQuestion = ({ kinds }: TurnLabel) => kinds.includes('question') && !kinds.includes('filters')
/** The extractor fills Form A, unless the turn is not about the search, or only a question (PD10, T-34). */
const usesExtractor = (label: TurnLabel) => aboutTheSearch(label) && !onlyQuestion(label)

export type TurnInput = Pick<TurnState, 'goalId' | 'last' | 'form' | 'lastRegister'> & { notesHint: boolean }
/** What only the composer reads: the last two turns and the Form B notes of the person (PD7a). */
export type ComposerContext = Pick<ComposerInput, 'turns' | 'formB'>

/** The cards that the person selected for a question: their facts, and with two or more the table of the comparison (T-49). */
export type SelectedCards = { comparison: Comparison | null; facts: CardFacts[]; spots: (Spot | null)[] }

/** With cards selected, a question gets an answer about them, and a message with filters goes to the normal chat (T-49). */
const comparesOn = (label: TurnLabel) => onlyQuestion(label) && aboutTheSearch(label) && label.band !== 'sensitive' && !label.danger

/**
 * The chat keeps the name of a card in the message of a question about one card: "About “2 BHK, full flat”: …". The name is
 * not the person's words, so the router, the extractor and the advisor read the message without it.
 */
export const withoutCardLabel = (text: string) => text.replace(/^About “[^”]+”: (?=\S)/, '')

/**
 * A question about selected cards (PD10): the answer of the advisor from the facts of the cards, which code took from the database.
 * With no answer, the lines of the comparison, or for one card a line that sends the person to the card. Two cards or more
 * also get the table. The question and the conflicts of the last reply stay open.
 */
function cardsReply({ comparison }: SelectedCards, advice: string | null, { language, label, last }: { language: ReplyLanguage; label: TurnLabel; last: AssistantParts | null }): AssistantReply {
  const lead = label.band === 'consequential' ? `${lineOf('handoff', language)} ` : ''
  const cheapest = comparison?.kind === 'place' && comparison.options.reduce((low, option, i) => (option.moveInCash < low.option.moveInCash ? { option, i } : low), { option: comparison.options[0]!, i: 0 })
  const lines = !comparison ? lineOf('cardNoAnswer', language)
    : cheapest ? `${lineOf('compareBest', language)} ${cheapestLine(cheapest.i + 1, rupees(cheapest.option.moveInCash), language)}` : lineOf('compareBest', language)
  return { version: 1, text: lead + (advice ?? lines), parts: assistantParts.parse({ ...(last ?? { asked: null }), comparison }) }
}

/**
 * The trips that a question about a distance asks for (the founders, 2026-11-11): from each card with a point to the place that the
 * question names, or between the two places that it names. Code measures them (`geo`), the advisor says them, and the chat maps them.
 * `located`: the places of the question as the locator found them. They count when they are more than the places of the map.
 */
export function tripsOf(question: string, cards: SelectedCards | null, located: Spot[] = []): Trip[] {
  if (!asksDistance(question)) return []
  const known = placesIn(question)
  const places = located.length > known.length ? located : known
  const to = places.at(-1)
  if (to && cards?.spots.some(Boolean)) {
    return cards.spots.flatMap((from, i) => (from ? [tripBetween(from, to, cards.spots.length > 1 ? i + 1 : null)] : [])).slice(0, maxTrips)
  }
  return places.length >= 2 ? [tripBetween(places[0]!, places[1]!)] : []
}

/** A question about a distance that names fewer places than a trip needs: one place with cards, two with none. The locator finds the rest. */
export const lacksPlace = (question: string, cards: SelectedCards | null) =>
  asksDistance(question) && placesIn(question).length < (cards?.spots.some(Boolean) ? 1 : 2)

/** What the advisor reads of the trips: with more cards, only the closest one keeps its route, so the answer stays short. */
export function tripFactsFor(trips: Trip[]) {
  const closest = trips.reduce((best, t, i) => (t.straightKm < trips[best]!.straightKm ? i : best), 0)
  return trips.map((t, i) => (i === closest ? factsOfTrip(t) : { ...factsOfTrip(t), train: null }))
}

/** Null: no observer (PD7a, PC-17). `religionOrCommunity`: the turn may state a preference or an own value (PD3c). */
export function notePlanOf(label: TurnLabel, religionOrCommunity: boolean, { sensitiveNotes }: Pick<AssistantSettings, 'sensitiveNotes'>) {
  if (!label.kinds.includes('context') || !usesExtractor(label) || religionOrCommunity || label.notes) return null
  if (label.band !== 'sensitive') return { visible: true }
  return sensitiveNotes === 'none' ? null : { visible: sensitiveNotes === 'visible' }
}

/** "What do you know about me?": a scripted line. It counts as the notes hint. The open question stays open (T-36). */
function notesReply(hasNotes: boolean, { language, last }: { language: ReplyLanguage; last: AssistantParts | null }): AssistantReply {
  const parts = assistantParts.parse({ ...(last ?? { asked: null }), comparison: null, notes: hasNotes, notesHint: hasNotes })
  return { version: 1, text: lineOf(hasNotes ? 'notesList' : 'notesEmpty', language), parts }
}

/** The hint ends the reply after the first note of the owner, one time (T-36). A sensitive reply asks nothing more (assistant-risks.md 4.4). */
const withNotesHint = (reply: AssistantReply, notesHint: boolean, language: ReplyLanguage): AssistantReply =>
  (notesHint && !reply.parts.notesHint ? { ...reply, text: `${reply.text} ${lineOf('notesHint', language)}`, parts: { ...reply.parts, notesHint: true } } : reply)

/** The other open goal of the owner that looks like the same move as a form, with its title (Figma 67:6489). */
export type SameMoveTarget = Pick<HeldMove, 'goalId' | 'title'>
type SameMoveCheck = (form: FormA) => Promise<SameMoveTarget | null>

/** The values that a turn put into Form A, by slot: what a held message keeps until "Same move?" has its answer. */
const valuesOf = (form: FormA, changed: readonly FormASlot[]): SlotValues => Object.fromEntries(changed.map((slot) => [slot, slotOf(form, slot).value]))

/** "Same move?" with its two chips. The reply holds the values, so the message changes neither goal until the answer. */
export const heldReply = (held: Omit<HeldMove, 'version'>, language: ReplyLanguage): AssistantReply =>
  ({ version: 1, text: lineOf('sameMove', language), parts: assistantParts.parse({ asked: null, held }) })

/**
 * Only a plain search waits for the answer. A disclosure gets its own reply (assistant-risks.md 4.4), and a religion or community
 * never waits in a held message (PD3c).
 */
const holds = (label: TurnLabel, turn: Pick<TurnState, 'failed' | 'mentionsOwnValue' | 'changed'>, hidden: boolean) =>
  label.band === 'core' && !label.danger && !label.notes && usesExtractor(label) && !turn.failed && !turn.mentionsOwnValue && !hidden && turn.changed.length > 0

/**
 * The steps of a typed turn (PD7a). The extractor starts with the router, so the router adds no wait (T-34).
 * `sameMove`: on the first message of a new goal, the check for an open goal of the same move. A match holds the message.
 */
export async function runTurn({ context, cards, shown = null, sameMove, ...given }: TurnInput & {
  text: string; context: ComposerContext; cards: SelectedCards | null; shown?: SelectedCards | null; sameMove?: SameMoveCheck
}, deps: AssistantDeps) {
  const input = { ...given, text: withoutCardLabel(given.text) }
  const start: TurnState = { ...input, ...noExtraction(input.form, false) }
  // A place that the map lacks, as "MGM college": the locator starts with the router, so the reply seldom waits for it (the founders, 2026-11-11).
  const locating = lacksPlace(input.text, cards ?? shown) ? locate(input.goalId, input.text, deps).catch((err: unknown) => {
    deps.req.log.error({ err }, 'the locator failed')
    return null
  }) : null
  const [label, extracted] = await Promise.all([routeTurn(input, deps), extractor(start, deps)])
  // A question can name an outside place too, though it fills no slot of Form A (T-22a).
  const notes = label.notes && label.band === 'core'
  // With cards selected, the input asks about them, so a message that the router cannot label is a question about them too.
  // Such a question never changes the search.
  const asked = !notes && cards && (comparesOn(label) || (label.band === 'core' && !label.kinds.length)) ? cards : null
  const extractedTurn = { ...start, ...(usesExtractor(label) && !asked && extracted) }
  // The answer to "Are you a man, a woman or non-binary?" is a word that code reads, so it needs no model (the founders, 2026-11-11).
  const said = input.last?.asked?.slot === 'gender' && isOpenSlot(extractedTurn.form.gender) ? genderIn(input.text) : null
  const withGender = said
    ? { ...extractedTurn, form: { ...extractedTurn.form, gender: { source: 'stated' as const, value: said } }, changed: [...extractedTurn.changed, 'gender' as const] }
    : extractedTurn
  const turn = { ...withGender, outsidePlaces: aboutTheSearch(label) ? extracted.outsidePlaces : [], label, language: languageOf(label.register ?? input.lastRegister) }
  const hidden = statesHiddenPreference({ community: label.community, preferences: turn.hiddenPreferences })
  // A failed extractor cannot tell an own value, so the observer does not run (PD3c).
  const notePlan = notePlanOf(label, hidden || turn.mentionsOwnValue || turn.failed, deps.settings)
  const target = sameMove && !input.last && !cards && holds(label, turn, hidden) ? await sameMove(turn.form) : null
  if (target) {
    const held = { ...target, values: valuesOf(turn.form, turn.changed), ambiguous: turn.ambiguous, outsidePlaces: turn.outsidePlaces, typed: true }
    return { form: input.form, reply: heldReply(held, turn.language), conflicts: [], label, ownValues: turn.ownValues, hiddenPreferences: {}, outsidePlaces: [], notePlan, held: true }
  }
  // With no selection, a question about the search reads the cards on the screen: "how far is this listing?" (the founders, 2026-11-11).
  const seen = !notes && !asked && shown && comparesOn(label) && label.band !== 'consequential' ? shown : null
  const facts = asked ? { cards: asked.facts, cardsAre: 'selected' as const } : seen ? { cards: seen.facts, cardsAre: 'shown' as const } : {}
  // A question about a distance gets the trips that code measured, and a map (the founders, 2026-11-11). Never in a 2b turn.
  const trips = notes || !aboutTheSearch(label) || label.band === 'consequential' || label.band === 'sensitive' ? [] : tripsOf(input.text, asked ?? seen, (await locating) ?? [])
  // A question of the search gets an answer too, also when the router cannot label it (the founders, 2026-11-11).
  const asks = label.kinds.includes('question') || (!label.kinds.length && looksLikeQuestion(input.text))
  const coreQuestion = label.band === 'core' && asks && aboutTheSearch(label) && !label.danger
  // A general question of band 2a gets a short answer before the open question, and a question about cards an answer from their
  // facts (PD10). It is one more call, only on such a turn.
  const advice = !notes && (asked || seen || label.band === 'general' || coreQuestion || trips.length)
    ? await advisor(input.goalId, { version: 1, language: turn.language, question: input.text, ...facts, ...(trips.length && { trips: tripFactsFor(trips) }) }, deps) : null
  // A core question about the cards on the screen gets only the answer. A general one keeps its hedge and the open question.
  const fixed = notes ? notesReply(context.formB.length > 0, turn) : asked ? cardsReply(asked, advice, turn)
    : seen && advice && label.band === 'core' ? cardsReply({ comparison: null, facts: seen.facts, spots: seen.spots }, advice, turn) : null
  const scripted = fixed ?? await replyWriter(turn, deps, advice)
  // An answer is in the language of the person already, so the composer writes only a plain reply.
  const plain = !fixed && !advice && label.band === 'core' && !turn.failed && !hidden ? await composeReply(scripted, turn, context, deps) : scripted
  // Each reply has its own trips: a reply that copies the parts of the last one must not show its map again.
  const reply = { ...plain, parts: { ...plain.parts, trips } }
  return {
    form: turn.form, reply: withNotesHint(reply, input.notesHint && label.band !== 'sensitive' && !label.danger, turn.language), conflicts: turn.conflicts, label,
    ownValues: turn.ownValues, hiddenPreferences: turn.hiddenPreferences, outsidePlaces: turn.outsidePlaces, notePlan, held: false,
  }
}

async function composeReply(reply: AssistantReply, turn: TurnState & { language: ReplyLanguage }, context: ComposerContext, deps: AssistantDeps) {
  const composed = await composer(turn.goalId, { version: 1, language: turn.language, draft: reply.text, form: filledSlots(turn.form), ...context, message: turn.text }, deps)
  return composed ? { ...reply, text: composed.text } : reply
}

/** A tap needs no router: each chip is an answer about the search. */
const tapLabel: TurnLabel = { version: 1, kinds: ['filters'], band: 'core', register: null, danger: false, community: false, notes: false, routerBand: null }

/** The value of the slot of a tap. A place type replaces the list, and "Show some PGs too" adds to it. */
function slotValueOf(tap: ChipTap, form: FormA) {
  if (tap.slot === 'intent') return tap.value === 'unclear' ? 'unclear' : tap.also ? withIntent(intentsOf(form), tap.value) : [tap.value]
  if (tap.slot !== 'budget') return tap.value
  const { min, max } = budgetBandOf(tap.value)
  return { min, max }
}

const isAreaGroup = (catalogue: Catalogue, slug: string) => catalogue.bySlug.get(slug)?.parent === null

/** The reply to answers that need no model: a chip tap, or the answers of the onboarding (PD9, T-48). */
const scriptedReply = ({ last, lastRegister }: Pick<TurnState, 'last' | 'lastRegister'>, form: FormA, changed: FormASlot[], deps: AssistantDeps) =>
  replyWriter({ ...noExtraction(form, false), changed, last, label: tapLabel, language: languageOf(lastRegister) }, deps)

/** The answers of the onboarding, before the goal exists (T-48). Null: an area that is not an area group. */
export async function runStart(input: Omit<TurnInput, 'goalId' | 'notesHint'> & { start: GoalStart }, deps: AssistantDeps) {
  const { area, areas: groups, budget, mustHaves = [], ...stated } = input.start
  const areas = groups ?? (area ? [area] : [])
  const catalogue = await catalogueOf(deps.db)
  if (!areas.every((slug) => isAreaGroup(catalogue, slug))) return null
  const answers = { ...stated, ...(areas.length && { areas }), ...(budget && { budget: slotValueOf({ slot: 'budget', value: budget }, input.form) }) }
  const stateOf = (value: unknown) => ({ source: 'stated', value })
  const form = formA.parse({
    ...input.form, ...Object.fromEntries(Object.entries(answers).map(([slot, value]) => [slot, stateOf(value)])),
    mustHaves: { ...input.form.mustHaves, ...Object.fromEntries(mustHaves.map((key) => [key, stateOf('dealbreaker')])) },
  })
  const changed = [...Object.keys(answers), ...mustHaves.map((key) => `mustHaves.${key}`)] as FormASlot[]
  return { form, values: valuesOf(form, changed), reply: await scriptedReply(input, form, changed, deps) }
}

/**
 * The answer to "Same move?": the held values go into the goal that the person picked, as the values of a typed turn, with no model call.
 * An earlier stated value stays, and the reply asks which to keep (PD3b). The reply then asks the next question of that goal.
 */
export async function runHeld(input: Pick<TurnState, 'last' | 'form' | 'lastRegister'> & { held: HeldMove }, deps: AssistantDeps) {
  const { held, last, lastRegister } = input
  const answering = (last?.conflicts ?? []).map(({ slot }) => slot)
  // The database keeps the values in its own key order, so "Got it" lists them in the order of Form A.
  const values: SlotValues = Object.fromEntries(formASlots.filter((slot) => slot in held.values).map((slot) => [slot, held.values[slot]]))
  const applied = applyValues(input.form, values, answering)
  const settled = answering.filter((slot) => held.values[slot] !== undefined && held.values[slot] !== 'unclear')
  const turn = { ...noExtraction(applied.form, false), ...applied, settled, ambiguous: held.ambiguous, last, label: tapLabel, language: languageOf(lastRegister) }
  return { form: applied.form, reply: await replyWriter(turn, deps) }
}

/** Null: an area that is not an area group. */
export async function runTap(input: TurnInput & { tap: ChipTap }, deps: AssistantDeps) {
  const { tap } = input
  const catalogue = await catalogueOf(deps.db)
  if (tap.slot === 'areas' && !tap.value.every((slug) => isAreaGroup(catalogue, slug))) return null
  const text = tapText(tap, (slug) => catalogue.bySlug.get(slug)!.name)
  // A tap answers its slot: its value replaces an earlier value, also a list of areas (T-09).
  const form = formA.parse(withSlot(input.form, tap.slot, slotValueOf(tap, input.form)))
  const reply = withNotesHint(await scriptedReply(input, form, [tap.slot], deps), input.notesHint, languageOf(input.lastRegister))
  return { text, form, reply, ownValues: { religion: null, community: null } }
}
