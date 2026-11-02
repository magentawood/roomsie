import { assistantReply, mustHaveKeys, replyInput, slotPath, type AssistantParts } from '@roomsie/contract'
import type { z } from 'zod'
import type { AssistantDeps, Handler } from '../../assistant'
import { catalogueOf } from '../../catalogue'
import { slotOf } from '../extractor/form-update'
import { questionFor, replyLines, valueText } from './texts'

const parts = (asked: AssistantParts['asked'], question: string | null): AssistantParts => ({ version: 1, asked, question })
/** The reply: what the turn filled, then the question. The turn keeps the question on its own for the next extractor. */
const reply = (ack: string, question: string, asked: AssistantParts['asked']) => ({ text: ack + question, parts: parts(asked, question) })

/**
 * A scripted reply, with no model: what the turn filled, then one question (PD7a). A conflict comes first,
 * then a conflict that the answer did not settle, then each name of two areas, then an unclear must-have weight (PD15),
 * then the next empty or unclear slot.
 */
export const replyWriter: Handler = async (turn, deps) => {
  const { form, changed, conflicts, ambiguous, failed, asked, lastQuestion } = turn
  return { reply: assistantReply.parse(await write(replyInput.parse({ form, changed, conflicts, ambiguous, failed, asked, lastQuestion }), deps)) }
}

const write = async (turn: z.output<typeof replyInput>, { db, settings }: AssistantDeps) => {
  const catalogue = await catalogueOf(db)
  if (turn.failed) return { text: replyLines.failed, parts: parts(turn.asked, turn.lastQuestion) }
  const filled = turn.changed.filter((slot) => slotOf(turn.form, slot).value !== 'unclear')
  const ack = filled.length ? `${replyLines.ack(filled.map((slot) => valueText(slot, slotOf(turn.form, slot).value, catalogue)))} ` : ''

  const conflict = turn.conflicts[0]
  if (conflict) {
    return reply(ack, replyLines.conflict(valueText(conflict.slot, conflict.earlier, catalogue), valueText(conflict.slot, conflict.later, catalogue)), { slot: conflict.slot, conflict: true })
  }
  // "doosra wala" fills nothing, so the conflict question comes again.
  if (turn.asked?.conflict && !turn.changed.includes(turn.asked.slot) && turn.lastQuestion) return reply(ack, turn.lastQuestion, turn.asked)
  if (turn.ambiguous.length) {
    const lines = turn.ambiguous.map(({ words, slugs }) => replyLines.ambiguous(words, slugs.map((slug) => catalogue.bySlug.get(slug)?.name ?? slug)))
    return reply(ack, lines.join(' '), { slot: 'areas', conflict: false })
  }
  const weight = mustHaveKeys.map((key) => `mustHaves.${key}` as const).find((slot) => slotOf(turn.form, slot).value === 'unclear')
  if (weight) return reply(ack, replyLines.weight(catalogue.mustHaveLabels.get(slotPath(weight)[1]!) ?? weight), { slot: weight, conflict: false })
  const next = settings.questionOrder.find((slot) => {
    const { source, value } = slotOf(turn.form, slot)
    return source === 'empty' || value === 'unclear'
  })
  if (!next) return { text: ack + replyLines.done, parts: parts(null, null) }
  return reply(ack, questionFor(next, catalogue), { slot: next, conflict: false })
}
