import type { FastifyRequest } from 'fastify'
import type { AssistantParts, AssistantReply, ExtractorOutput, FormA } from '@roomsie/contract'
import type { Db } from '../db/client'
import type { Models } from '../models/models'
import { extractor } from './handlers/extractor/extractor'
import { replyWriter } from './handlers/reply/reply'
import type { AssistantSettings } from './settings'

export type AssistantDeps = { req: FastifyRequest; db: Db; models?: Models; settings: AssistantSettings; today: () => string }

/** One typed turn, as the handlers fill it in order. Each handler gives a schema of the contract. */
export type Turn = {
  goalId: string
  text: string
  /** The text of the last reply of the assistant. */
  lastQuestion: string | null
  asked: AssistantParts['asked']
  form: FormA
  reply: AssistantReply | null
} & Omit<ExtractorOutput, 'version' | 'form'>
export type Handler = (turn: Turn, deps: AssistantDeps) => Promise<Partial<Turn>>

/** The steps of a typed turn, in order (PD7a). The router, the observer and the advisor are more handlers here. */
const handlers: Handler[] = [extractor, replyWriter]

export async function runTurn(input: Pick<Turn, 'goalId' | 'text' | 'lastQuestion' | 'asked' | 'form'>, deps: AssistantDeps) {
  let turn: Turn = { ...input, changed: [], conflicts: [], ambiguous: null, failed: false, reply: null }
  for (const handler of handlers) turn = { ...turn, ...(await handler(turn, deps)) }
  return { form: turn.form, reply: turn.reply!, conflicts: turn.conflicts }
}
