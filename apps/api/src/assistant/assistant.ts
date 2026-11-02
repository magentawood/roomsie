import type { FastifyRequest } from 'fastify'
import type { AssistantParts, AssistantReply, ExtractorOutput, FormA, SlotConflict } from '@roomsie/contract'
import type { Db } from '../db/client'
import type { Models } from '../models/models'
import { extractor, noExtraction } from './handlers/extractor/extractor'
import { replyWriter } from './handlers/reply/reply'
import type { AssistantSettings } from './settings'

export type AssistantDeps = { req: FastifyRequest; db: Db; models?: Models; settings: AssistantSettings; today: () => string }

/** One typed turn, as the handlers fill it in order. */
export type TurnState = {
  goalId: string
  text: string
  lastQuestion: string | null
  asked: AssistantParts['asked']
  /** The conflicts that the last reply asked about. */
  openConflicts: SlotConflict[]
  form: FormA
  reply: AssistantReply | null
} & Omit<ExtractorOutput, 'version' | 'form'>
export type Handler = (turn: TurnState, deps: AssistantDeps) => Promise<Partial<TurnState>>

/** The steps of a typed turn, in order (PD7a). The router, the observer and the advisor are more handlers here. */
const handlers: Handler[] = [extractor, replyWriter]

export async function runTurn(input: Pick<TurnState, 'goalId' | 'text' | 'lastQuestion' | 'asked' | 'openConflicts' | 'form'>, deps: AssistantDeps) {
  let turn: TurnState = { ...input, ...noExtraction(input.form, false), reply: null }
  for (const handler of handlers) turn = { ...turn, ...(await handler(turn, deps)) }
  return { form: turn.form, reply: turn.reply!, conflicts: turn.conflicts }
}
