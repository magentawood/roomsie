import type { FastifyRequest } from 'fastify'
import { budgetBands, tapText, type AssistantParts, type ChipTap, type ExtractorOutput, type FormA, type TurnLabel } from '@roomsie/contract'
import type { Db } from '../db/client'
import type { Models } from '../models/models'
import { catalogueOf } from './catalogue'
import { extractor, noExtraction } from './handlers/extractor/extractor'
import { applyValues } from './handlers/extractor/form-update'
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

/** The steps of a typed turn (PD7a). The extractor starts with the router, so the router adds no wait (T-34). */
export async function runTurn(input: Pick<TurnState, 'goalId' | 'text' | 'last' | 'form'>, deps: AssistantDeps) {
  const start: TurnState = { ...input, ...noExtraction(input.form, false) }
  const [label, extracted] = await Promise.all([routeTurn(input, deps), extractor(start, deps)])
  const turn = { ...start, ...(usesExtractor(label) && extracted), label }
  return { form: turn.form, reply: await replyWriter(turn, deps), conflicts: turn.conflicts, label, ownValues: turn.ownValues, hiddenPreferences: turn.hiddenPreferences }
}

/** A tap needs no router: each chip is an answer about the search. */
const tapLabel: TurnLabel = { version: 1, kinds: ['filters'], band: 'core', register: null, danger: false, community: false, routerBand: null }

/** The value of a chip in Form A. A budget band gives its two bounds. */
function valueOf(tap: ChipTap) {
  if (tap.slot !== 'budget') return tap.value
  const { min, max } = budgetBands.find((band) => band.id === tap.value)!
  return { min, max }
}

/** A chip tap runs no model (PD9, T-09). Its value answers its slot, and the scripted reply follows. Null: an area that is not an area group. */
export async function runTap(input: Pick<TurnState, 'goalId' | 'last' | 'form'> & { tap: ChipTap }, deps: AssistantDeps) {
  const { tap } = input
  const catalogue = await catalogueOf(deps.db)
  if (tap.slot === 'areas' && !tap.value.every((slug) => catalogue.bySlug.get(slug)?.parent === null)) return null
  const text = tapText(tap, (slug) => catalogue.bySlug.get(slug)!.name)
  const { form, changed } = applyValues(input.form, { [tap.slot]: valueOf(tap) }, [tap.slot])
  const turn = { ...input, text, ...noExtraction(form, false), changed, label: tapLabel }
  return { text, form, reply: await replyWriter(turn, deps) }
}
