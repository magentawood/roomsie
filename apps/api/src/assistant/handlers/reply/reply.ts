import { assistantReply, mustHaveKeys, replyInput, slotPath, type AssistantParts, type SlotConflict } from '@roomsie/contract'
import type { z } from 'zod'
import type { AssistantDeps, Handler } from '../../assistant'
import { catalogueOf } from '../../catalogue'
import { slotOf } from '../extractor/form-update'
import { questionFor, replyLines, valueText } from './texts'

const parts = (asked: AssistantParts['asked'], question: string | null, conflicts: SlotConflict[] = []): AssistantParts => ({ version: 1, asked, question, conflicts })
/** The reply: what the turn filled, then the question. The turn keeps the question on its own for the next extractor. */
const reply = (ack: string, question: string, asked: AssistantParts['asked'], conflicts: SlotConflict[] = []) => ({ text: ack + question, parts: parts(asked, question, conflicts) })

/**
 * A scripted reply, with no model: what the turn filled, then one question (PD7a). The conflicts come first: the new ones,
 * and the open ones that the answer did not settle. Then each name of two areas, then an unclear must-have weight (PD15),
 * then the next empty or unclear slot.
 */
export const replyWriter: Handler = async (turn, deps) => {
  const { form, changed, conflicts, settled, ambiguous, failed, asked, lastQuestion, openConflicts } = turn
  return { reply: assistantReply.parse(await write(replyInput.parse({ form, changed, conflicts, settled, ambiguous, failed, asked, lastQuestion, openConflicts }), deps)) }
}

const write = async (turn: z.output<typeof replyInput>, { db, settings }: AssistantDeps) => {
  const catalogue = await catalogueOf(db)
  if (turn.failed) return { text: replyLines.failed, parts: parts(turn.asked, turn.lastQuestion, turn.openConflicts) }
  const filled = turn.changed.filter((slot) => slotOf(turn.form, slot).value !== 'unclear')
  const ack = filled.length ? `${replyLines.ack(filled.map((slot) => valueText(slot, slotOf(turn.form, slot).value, catalogue)))} ` : ''

  const open = turn.openConflicts.filter(({ slot }) => !turn.settled.includes(slot) && !turn.conflicts.some((c) => c.slot === slot))
  const conflicts = [...turn.conflicts, ...open]
  if (conflicts.length) {
    const lines = conflicts.map(({ slot, earlier, later }) => replyLines.conflict(valueText(slot, earlier, catalogue), valueText(slot, later, catalogue)))
    return reply(ack, lines.join(' '), { slot: conflicts[0]!.slot, conflict: true }, conflicts)
  }
  if (turn.ambiguous.length) {
    const lines = turn.ambiguous.map(({ words, slugs }) => replyLines.ambiguous(words, slugs.map((slug) => catalogue.bySlug.get(slug)?.name ?? slug)))
    return reply(ack, lines.join(' '), { slot: 'areas', conflict: false })
  }
  const unclearWeightSlot = mustHaveKeys.map((key) => `mustHaves.${key}` as const).find((slot) => slotOf(turn.form, slot).value === 'unclear')
  if (unclearWeightSlot) {
    return reply(ack, replyLines.weight(catalogue.mustHaveLabels.get(slotPath(unclearWeightSlot)[1]!) ?? unclearWeightSlot), { slot: unclearWeightSlot, conflict: false })
  }
  const next = settings.questionOrder.find((slot) => {
    const { source, value } = slotOf(turn.form, slot)
    return source === 'empty' || value === 'unclear'
  })
  if (!next) return { text: ack + replyLines.done, parts: parts(null, null) }
  return reply(ack, questionFor(next, catalogue), { slot: next, conflict: false })
}
