import { assistantReply, mustHaveKeys, replyInput, slotPath, type AssistantParts, type SlotConflict, type TurnLabel } from '@roomsie/contract'
import type { z } from 'zod'
import type { AssistantDeps, TurnState } from '../../assistant'
import { catalogueOf } from '../../catalogue'
import { slotOf } from '../extractor/form-update'
import { questionFor, replyLines, valueText } from './texts'

const parts = (asked: AssistantParts['asked'], question: string | null, conflicts: SlotConflict[]): AssistantParts => ({ version: 1, asked, question, conflicts })

/** The line before the reply, by the band of the turn (PD10, T-34). */
function leadOf({ band, danger }: TurnLabel) {
  switch (band) {
    case 'general': case 'consequential': return `${replyLines.noted} `
    case 'out_of_scope': return `${replyLines.outOfScope} `
    case 'adversarial': return `${replyLines.adversarial} `
    case 'sensitive': return danger ? `${replyLines.sensitive} ${replyLines.danger} ` : `${replyLines.sensitive} `
    case 'core': return ''
  }
}

/**
 * A scripted reply, with no model: what the turn filled, then one question (PD7a). The conflicts come first: the new ones,
 * and the open ones that the answer did not settle. Then each name of two areas, then an unclear must-have weight (PD15),
 * then the next empty or unclear slot.
 */
export async function replyWriter(turn: TurnState & { label: TurnLabel }, deps: AssistantDeps) {
  const { form, changed, conflicts, settled, ambiguous, failed, last, label } = turn
  return assistantReply.parse(await write(replyInput.parse({ form, changed, conflicts, settled, ambiguous, failed, last, label }), deps))
}

const write = async (turn: z.output<typeof replyInput>, { db, settings }: AssistantDeps) => {
  const catalogue = await catalogueOf(db)
  const lead = leadOf(turn.label)
  // Only a core turn asks the person to send the message again: never after a disclosure (T-34).
  if (turn.failed && turn.label.band === 'core') return { text: replyLines.failed, parts: parts(turn.last?.asked ?? null, turn.last?.question ?? null, turn.last?.conflicts ?? []) }
  const filled = turn.changed.filter((slot) => slotOf(turn.form, slot).value !== 'unclear')
  const ack = lead + (filled.length ? `${replyLines.ack(filled.map((slot) => valueText(slot, slotOf(turn.form, slot).value, catalogue)))} ` : '')
  /** The reply: the lead, what the turn filled, then the question. The turn keeps the question on its own for the next extractor. */
  const reply = (before: string, question: string, asked: AssistantParts['asked'], conflicts: SlotConflict[] = []) => ({
    text: before + (turn.label.band === 'out_of_scope' ? replyLines.backToIt(question) : question),
    parts: parts(asked, question, conflicts),
  })

  const open = (turn.last?.conflicts ?? []).filter(({ slot }) => !turn.settled.includes(slot) && !turn.conflicts.some((c) => c.slot === slot))
  const conflicts = [...turn.conflicts, ...open]
  if (conflicts.length) {
    const lines = conflicts.map(({ slot, earlier, later }) => replyLines.conflict(valueText(slot, earlier, catalogue), valueText(slot, later, catalogue)))
    return reply(ack, lines.join(' '), { slot: conflicts[0]!.slot }, conflicts)
  }
  if (turn.ambiguous.length) {
    const lines = turn.ambiguous.map(({ words, slugs }) => replyLines.ambiguous(words, slugs.map((slug) => catalogue.bySlug.get(slug)?.name ?? slug)))
    return reply(ack, lines.join(' '), { slot: 'areas' })
  }
  const unclearWeightSlot = mustHaveKeys.map((key) => `mustHaves.${key}` as const).find((slot) => slotOf(turn.form, slot).value === 'unclear')
  if (unclearWeightSlot) return reply(ack, replyLines.weight(catalogue.mustHaveLabels.get(slotPath(unclearWeightSlot)[1]!) ?? unclearWeightSlot), { slot: unclearWeightSlot })
  const next = settings.questionOrder.find((slot) => {
    const { source, value } = slotOf(turn.form, slot)
    return source === 'empty' || value === 'unclear'
  })
  if (!next) return { text: ack + replyLines.done, parts: parts(null, null, []) }
  return reply(ack, questionFor(next, catalogue), { slot: next })
}
