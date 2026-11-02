import type { FastifyRequest } from 'fastify'
import type { AssistantParts, ExtractorOutput, FormA, TurnLabel } from '@roomsie/contract'
import type { Db } from '../db/client'
import type { Models } from '../models/models'
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

/** The steps of a typed turn (PD7a). The extractor starts with the router, so the router adds no wait (T-34). */
export async function runTurn(input: Pick<TurnState, 'goalId' | 'text' | 'last' | 'form'>, deps: AssistantDeps) {
  const start: TurnState = { ...input, ...noExtraction(input.form, false) }
  const [label, extracted] = await Promise.all([routeTurn(input, deps), extractor(start, deps)])
  const turn = { ...start, ...(usesExtractor(label) && extracted), label }
  return { form: turn.form, reply: await replyWriter(turn, deps), conflicts: turn.conflicts, label, ownValues: turn.ownValues, preferences: turn.preferences }
}
