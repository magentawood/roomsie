import type { FastifyRequest } from 'fastify'
import type { AssistantParts, FormA, FormASlot } from '@roomsie/contract'
import type { Db } from '../db/client'
import type { Models } from '../models/models'
import { extractor } from './handlers/extractor/extractor'
import type { Conflict } from './handlers/extractor/form-update'
import { replyWriter } from './handlers/reply/reply'
import type { AssistantSettings } from './settings'

export type AssistantDeps = { db: Db; models?: Models; settings: AssistantSettings; today: () => string }

/** One typed turn, as the handlers fill it in order. */
export type Turn = {
  req: FastifyRequest
  goalId: string
  text: string
  /** The text and the slot of the last reply of the assistant. */
  lastQuestion: string | null
  asked: AssistantParts['asked']
  form: FormA
  changed: FormASlot[]
  conflicts: Conflict[]
  /** A name of two or more areas, such as "Andheri". */
  ambiguous: { words: string; slugs: string[] } | null
  /** No model gave an answer, so the form did not change. */
  failed: boolean
  reply: { text: string; parts: AssistantParts } | null
}
export type Handler = (turn: Turn, deps: AssistantDeps) => Promise<Partial<Turn>>

/** The steps of a typed turn, in order (PD7a). The router, the observer and the advisor are more handlers here. */
const handlers: Handler[] = [extractor, replyWriter]

/** The one entry point of the assistant. */
export async function runTurn(input: Pick<Turn, 'req' | 'goalId' | 'text' | 'lastQuestion' | 'asked' | 'form'>, deps: AssistantDeps) {
  let turn: Turn = { ...input, changed: [], conflicts: [], ambiguous: null, failed: false, reply: null }
  for (const handler of handlers) turn = { ...turn, ...(await handler(turn, deps)) }
  return { form: turn.form, reply: turn.reply! }
}
