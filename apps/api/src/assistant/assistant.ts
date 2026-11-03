import type { FastifyRequest } from 'fastify'
import { budgetBandOf, formA, formASlots, statesHiddenPreference, tapText, type AssistantParts, type AssistantReply, type ChipTap, type ComposerInput, type ReplyLanguage, type ExtractorOutput, type FormA, type TurnLabel, type GoalStart, type FormASlot } from '@roomsie/contract'
import type { Db } from '../db/client'
import type { Models } from '../models/models'
import { catalogueOf } from './catalogue'
import { composer } from './handlers/composer/composer'
import { extractor, noExtraction } from './handlers/extractor/extractor'
import { slotOf } from './handlers/extractor/form-update'
import { replyWriter } from './handlers/reply/reply'
import { routeTurn } from './handlers/router/router'
import { languageOf } from './lines'
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
/** The extractor fills Form A, unless the turn is not about the search, or only a question (PD10, T-34). */
const usesExtractor = (label: TurnLabel) => aboutTheSearch(label) && !(label.kinds.includes('question') && !label.kinds.includes('filters'))

export type TurnInput = Pick<TurnState, 'goalId' | 'last' | 'form' | 'lastRegister'>
/** What only the composer reads: the last two turns and the Form B notes of the person (PD7a). */
export type ComposerContext = Pick<ComposerInput, 'turns' | 'formB'>

/** The steps of a typed turn (PD7a). The extractor starts with the router, so the router adds no wait (T-34). */
export async function runTurn({ context, ...input }: TurnInput & { text: string; context: ComposerContext }, deps: AssistantDeps) {
  const start: TurnState = { ...input, ...noExtraction(input.form, false) }
  const [label, extracted] = await Promise.all([routeTurn(input, deps), extractor(start, deps)])
  // A question can name an outside place too, though it fills no slot of Form A (T-22a).
  const turn = { ...start, ...(usesExtractor(label) && extracted), outsidePlaces: aboutTheSearch(label) ? extracted.outsidePlaces : [], label, language: languageOf(label.register ?? input.lastRegister) }
  const scripted = await replyWriter(turn, deps)
  const hidden = statesHiddenPreference({ community: label.community, preferences: turn.hiddenPreferences })
  const reply = label.band === 'core' && !turn.failed && !hidden ? await composeReply(scripted, turn, context, deps) : scripted
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

/** The answers of the onboarding: one scripted reply, with no model call (T-48). Null: an area that is not an area group. */
export async function runStart(input: TurnInput & { start: GoalStart }, deps: AssistantDeps) {
  const { area, budget, ...stated } = input.start
  if (area && (await catalogueOf(deps.db)).bySlug.get(area)?.parent !== null) return null
  const answers = { ...stated, ...(area && { areas: [area] }), ...(budget && { budget: slotValueOf({ slot: 'budget', value: budget }) }) }
  const form = formA.parse({ ...input.form, ...Object.fromEntries(Object.entries(answers).map(([slot, value]) => [slot, { source: 'stated', value }])) })
  const changed = Object.keys(answers) as FormASlot[]
  const turn = { ...input, text: '', ...noExtraction(form, false), changed, label: tapLabel }
  return { id: input.goalId, form, reply: await replyWriter({ ...turn, language: languageOf(input.lastRegister) }, deps) }
}

/** No model call (PD9). Null: an area that is not an area group. */
export async function runTap(input: TurnInput & { tap: ChipTap }, deps: AssistantDeps) {
  const { tap } = input
  const catalogue = await catalogueOf(deps.db)
  if (tap.slot === 'areas' && !tap.value.every((slug) => catalogue.bySlug.get(slug)?.parent === null)) return null
  const text = tapText(tap, (slug) => catalogue.bySlug.get(slug)!.name)
  // A tap answers its slot: its value replaces an earlier value, also a list of areas (T-09).
  const form = formA.parse({ ...input.form, [tap.slot]: { source: 'stated', value: slotValueOf(tap) } })
  const turn = { ...input, text, ...noExtraction(form, false), changed: [tap.slot], label: tapLabel }
  return { text, form, reply: await replyWriter({ ...turn, language: languageOf(input.lastRegister) }, deps), ownValues: turn.ownValues }
}
