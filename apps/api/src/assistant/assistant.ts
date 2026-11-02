import type { FastifyRequest } from 'fastify'
import type { AssistantParts, AssistantReply, ExtractorOutput, FormA, TurnLabel } from '@roomsie/contract'
import type { Db } from '../db/client'
import type { Models } from '../models/models'
import { extractor, noExtraction } from './handlers/extractor/extractor'
import { replyWriter } from './handlers/reply/reply'
import { routeTurn } from './handlers/router/router'
import type { AssistantSettings } from './settings'

export type AssistantDeps = { req: FastifyRequest; db: Db; models?: Models; settings: AssistantSettings; today: () => string }

/** One typed turn, as the handlers fill it in order. */
export type TurnState = {
  goalId: string
  text: string
  /** The last reply of the assistant: its question, the slot that it asked about, and its open conflicts. */
  last: AssistantParts | null
  form: FormA
  /** The label of the router. Null until the router answers. */
  label: TurnLabel | null
  reply: AssistantReply | null
} & Omit<ExtractorOutput, 'version' | 'form'>
export type Handler = (turn: TurnState, deps: AssistantDeps) => Promise<Partial<TurnState>>

/** The extractor fills Form A, unless the turn is off topic, adversarial, or only a question of band 2 (PD10, T-34). */
const usesExtractor = ({ band, kinds }: TurnLabel) =>
  band === 'core' || band === 'sensitive' || ((band === 'general' || band === 'consequential') && kinds.includes('filters'))

/** The steps of a typed turn (PD7a). The extractor starts with the router, so the router adds no wait (T-34). */
export async function runTurn(input: Pick<TurnState, 'goalId' | 'text' | 'last' | 'form'>, deps: AssistantDeps) {
  const start: TurnState = { ...input, ...noExtraction(input.form, false), label: null, reply: null }
  const [label, extracted] = await Promise.all([routeTurn(input, deps), extractor(start, deps)])
  const turn: TurnState = { ...start, ...(usesExtractor(label) && extracted), label }
  const { reply } = await replyWriter(turn, deps)
  return { form: turn.form, reply: reply!, conflicts: turn.conflicts, label }
}
