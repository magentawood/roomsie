import { assistantReply, mustHaveKeys, type AssistantParts, type FormASlot } from '@roomsie/contract'
import type { AssistantDeps, Handler, Turn } from '../../assistant'
import { catalogueOf } from '../../catalogue'
import { slotOf } from '../extractor/form-update'
import { lines, questionFor, valueText } from './texts'

const parts = (asked: AssistantParts['asked']): AssistantParts => ({ version: 1, asked })

/**
 * A scripted reply, with no model: what the turn filled, then one question (PD7a). A conflict comes first,
 * then a name of two areas, then an unclear must-have weight (PD15), then the next empty or unclear slot.
 */
export const replyWriter: Handler = async (turn, deps) => ({ reply: assistantReply.parse(await write(turn, deps)) })

const write = async (turn: Turn, { db, settings }: AssistantDeps) => {
  const catalogue = await catalogueOf(db)
  if (turn.failed) return { text: lines.failed, parts: parts(turn.asked) }
  const said = (slot: FormASlot) => valueText(slot, slotOf(turn.form, slot).value, catalogue)
  const filled = turn.changed.filter((slot) => slotOf(turn.form, slot).value !== 'unclear')
  const ack = filled.length ? `${lines.ack(filled.map(said))} ` : ''

  const conflict = turn.conflicts[0]
  if (conflict) {
    const text = lines.conflict(valueText(conflict.slot, conflict.earlier, catalogue), valueText(conflict.slot, conflict.later, catalogue))
    return { text: ack + text, parts: parts({ slot: conflict.slot, conflict: true }) }
  }
  if (turn.ambiguous) {
    const text = lines.ambiguous(turn.ambiguous.words, turn.ambiguous.slugs.map((slug) => catalogue.names.get(slug) ?? slug))
    return { text: ack + text, parts: parts({ slot: 'areas', conflict: false }) }
  }
  const weight = mustHaveKeys.map((key) => `mustHaves.${key}` as const).find((slot) => slotOf(turn.form, slot).value === 'unclear')
  if (weight) {
    const text = lines.weight(catalogue.mustHaveLabels.get(weight.split('.')[1]!) ?? weight)
    return { text: ack + text, parts: parts({ slot: weight, conflict: false }) }
  }
  const next = settings.questionOrder.find((slot) => {
    const { source, value } = slotOf(turn.form, slot)
    return source === 'empty' || value === 'unclear'
  })
  if (!next) return { text: ack + lines.done, parts: parts(null) }
  return { text: ack + questionFor(next, catalogue), parts: parts({ slot: next, conflict: false }) }
}
