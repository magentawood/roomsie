import type { FastifyRequest } from 'fastify'
import { budgetBandOf, formA, tapText, type AssistantParts, type ChipTap, type ExtractorOutput, type FormA, type TurnLabel } from '@roomsie/contract'
import type { Db } from '../db/client'
import type { Models } from '../models/models'
import { catalogueOf } from './catalogue'
import { extractor, noExtraction } from './handlers/extractor/extractor'
import { replyWriter } from './handlers/reply/reply'
import { routeTurn } from './handlers/router/router'
import type { AssistantSettings } from './settings'

export type AssistantDeps = { req: FastifyRequest; db: Db; models?: Models; settings: AssistantSettings; today: () => string }

export type TurnState = {
  goalId: string
  text: string
  /** The last reply of the assistant: its question, the slot that it asked about, and its open conflicts. */
  last: AssistantParts | null
  form: FormA
} & Omit<ExtractorOutput, 'version' | 'form'>

/** The extractor fills Form A, unless the turn is off topic, adversarial, or only a question (PD10, T-34). */
const usesExtractor = ({ band, kinds }: TurnLabel) =>
  band !== 'out_of_scope' && band !== 'adversarial' && !(kinds.includes('question') && !kinds.includes('filters'))

/** What each turn starts from: the goal, the last reply and the form. */
export type TurnInput = Pick<TurnState, 'goalId' | 'last' | 'form'>

/** The steps of a typed turn (PD7a). The extractor starts with the router, so the router adds no wait (T-34). */
export async function runTurn(input: TurnInput & { text: string }, deps: AssistantDeps) {
  const start: TurnState = { ...input, ...noExtraction(input.form, false) }
  const [label, extracted] = await Promise.all([routeTurn(input, deps), extractor(start, deps)])
  const turn = { ...start, ...(usesExtractor(label) && extracted), label }
  return { form: turn.form, reply: await replyWriter(turn, deps), conflicts: turn.conflicts, label, ownValues: turn.ownValues, hiddenPreferences: turn.hiddenPreferences }
}

/** A tap needs no router: each chip is an answer about the search. */
const tapLabel: TurnLabel = { version: 1, kinds: ['filters'], band: 'core', register: null, danger: false, community: false, routerBand: null }

function slotValueOf(tap: ChipTap) {
  if (tap.slot !== 'budget') return tap.value
  const { min, max } = budgetBandOf(tap.value)
  return { min, max }
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
  return { text, form, reply: await replyWriter(turn, deps), ownValues: turn.ownValues }
}
