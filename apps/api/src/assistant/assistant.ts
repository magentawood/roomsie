import type { FastifyRequest } from 'fastify'
import { assistantParts, budgetBandOf, formA, formASlots, statesHiddenPreference, tapText, type AssistantParts, type Comparison, type AssistantReply, type ChipTap, type ComposerInput, type ReplyLanguage, type ExtractorOutput, type FormA, type TurnLabel, type GoalStart, type FormASlot } from '@roomsie/contract'
import type { Db } from '../db/client'
import type { Models } from '../models/models'
import { catalogueOf, type Catalogue } from './catalogue'
import { composer } from './handlers/composer/composer'
import { extractor, noExtraction } from './handlers/extractor/extractor'
import { slotOf } from './handlers/extractor/form-update'
import { replyWriter } from './handlers/reply/reply'
import { rupees } from './handlers/reply/texts'
import { routeTurn } from './handlers/router/router'
import { cheapestLine, languageOf, lineOf } from './lines'
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

export type TurnInput = Pick<TurnState, 'goalId' | 'last' | 'form' | 'lastRegister'>
/** What only the composer reads: the last two turns and the Form B notes of the person (PD7a). */
export type ComposerContext = Pick<ComposerInput, 'turns' | 'formB'>

/** With cards selected, a question gets the comparison, and a message with filters goes to the normal chat (T-49). */
const comparesOn = (label: TurnLabel) => onlyQuestion(label) && aboutTheSearch(label) && label.band !== 'sensitive' && !label.danger

/** No model reads a card (scope-policy.md). The question and the conflicts of the last reply stay open. */
function comparisonReply(table: Comparison, { language, label, last }: { language: ReplyLanguage; label: TurnLabel; last: AssistantParts | null }): AssistantReply {
  const lead = label.band === 'consequential' ? `${lineOf('handoff', language)} ` : ''
  const best = lineOf('compareBest', language)
  const cheapest = table.kind === 'place' && table.options.reduce((low, option, i) => (option.moveInCash < low.option.moveInCash ? { option, i } : low), { option: table.options[0]!, i: 0 })
  const text = lead + (cheapest ? `${best} ${cheapestLine(cheapest.i + 1, rupees(cheapest.option.moveInCash), language)}` : best)
  return { version: 1, text, parts: assistantParts.parse({ ...(last ?? { asked: null }), comparison: table }) }
}

/** The steps of a typed turn (PD7a). The extractor starts with the router, so the router adds no wait (T-34). */
export async function runTurn({ context, comparison, ...input }: TurnInput & { text: string; context: ComposerContext; comparison: Comparison | null }, deps: AssistantDeps) {
  const start: TurnState = { ...input, ...noExtraction(input.form, false) }
  const [label, extracted] = await Promise.all([routeTurn(input, deps), extractor(start, deps)])
  // A question can name an outside place too, though it fills no slot of Form A (T-22a).
  const turn = { ...start, ...(usesExtractor(label) && extracted), outsidePlaces: aboutTheSearch(label) ? extracted.outsidePlaces : [], label, language: languageOf(label.register ?? input.lastRegister) }
  const compared = comparison && comparesOn(label) ? comparisonReply(comparison, turn) : null
  const scripted = compared ?? await replyWriter(turn, deps)
  const hidden = statesHiddenPreference({ community: label.community, preferences: turn.hiddenPreferences })
  const reply = !compared && label.band === 'core' && !turn.failed && !hidden ? await composeReply(scripted, turn, context, deps) : scripted
  return { form: turn.form, reply, conflicts: turn.conflicts, label, ownValues: turn.ownValues, hiddenPreferences: turn.hiddenPreferences, outsidePlaces: turn.outsidePlaces }
}

async function composeReply(reply: AssistantReply, turn: TurnState & { language: ReplyLanguage }, context: ComposerContext, deps: AssistantDeps) {
  const form = Object.fromEntries(formASlots.flatMap((slot) => {
    const { source, value } = slotOf(turn.form, slot)
    return source === 'empty' ? [] : [[slot, value]]
  }))
  const composed = await composer(turn.goalId, { version: 1, language: turn.language, draft: reply.text, form, ...context, message: turn.text }, deps)
  return composed ? { ...reply, text: composed.text } : reply
}

/** A tap needs no router: each chip is an answer about the search. */
const tapLabel: TurnLabel = { version: 1, kinds: ['filters'], band: 'core', register: null, danger: false, community: false, routerBand: null }

function slotValueOf(tap: ChipTap) {
  if (tap.slot !== 'budget') return tap.value
  const { min, max } = budgetBandOf(tap.value)
  return { min, max }
}

const isAreaGroup = (catalogue: Catalogue, slug: string) => catalogue.bySlug.get(slug)?.parent === null

/** The reply to answers that need no model: a chip tap, or the answers of the onboarding (PD9, T-48). */
const scriptedReply = ({ last, lastRegister }: Pick<TurnInput, 'last' | 'lastRegister'>, form: FormA, changed: FormASlot[], deps: AssistantDeps) =>
  replyWriter({ ...noExtraction(form, false), changed, last, label: tapLabel, language: languageOf(lastRegister) }, deps)

/** The answers of the onboarding, before the goal exists (T-48). Null: an area that is not an area group. */
export async function runStart(input: Omit<TurnInput, 'goalId'> & { start: GoalStart }, deps: AssistantDeps) {
  const { area, budget, ...stated } = input.start
  if (area && !isAreaGroup(await catalogueOf(deps.db), area)) return null
  const answers = { ...stated, ...(area && { areas: [area] }), ...(budget && { budget: slotValueOf({ slot: 'budget', value: budget }) }) }
  const form = formA.parse({ ...input.form, ...Object.fromEntries(Object.entries(answers).map(([slot, value]) => [slot, { source: 'stated', value }])) })
  return { form, reply: await scriptedReply(input, form, Object.keys(answers) as FormASlot[], deps) }
}

/** Null: an area that is not an area group. */
export async function runTap(input: TurnInput & { tap: ChipTap }, deps: AssistantDeps) {
  const { tap } = input
  const catalogue = await catalogueOf(deps.db)
  if (tap.slot === 'areas' && !tap.value.every((slug) => isAreaGroup(catalogue, slug))) return null
  const text = tapText(tap, (slug) => catalogue.bySlug.get(slug)!.name)
  // A tap answers its slot: its value replaces an earlier value, also a list of areas (T-09).
  const form = formA.parse({ ...input.form, [tap.slot]: { source: 'stated', value: slotValueOf(tap) } })
  return { text, form, reply: await scriptedReply(input, form, [tap.slot], deps), ownValues: { religion: null, community: null } }
}
