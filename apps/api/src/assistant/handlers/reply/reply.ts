import { assistantReply, chipSlots, intentsOf, isOpenSlot, mustHaveKeys, replyInput, slotOf, slotPath, type AssistantParts, type FormASlot, type ReplyLanguage, type TurnLabel } from '@roomsie/contract'
import type { z } from 'zod'
import type { AssistantDeps, TurnState } from '../../assistant'
import { catalogueOf } from '../../catalogue'
import { backToIt, lineOf } from '../../lines'
import { questionFor, replyLines, valueText } from './texts'

type PartsOf = Pick<AssistantParts, 'asked' | 'question'> & Partial<Pick<AssistantParts, 'conflicts' | 'chips'>>
const parts = (of: PartsOf): AssistantParts => ({ version: 1, conflicts: [], chips: null, comparison: null, notes: false, notesHint: false, held: null, trips: [], ...of })
const chipSlotOf = (slot: FormASlot | undefined) => chipSlots.find((chip) => chip === slot) ?? null

/**
 * The line before the reply, by the band of the turn (PD10, T-34). A 2a question gets the answer of the advisor and the hedge,
 * or "I've noted it" with no answer. A core question gets its answer with no hedge. A 2b question gets the hand-off until the articles of T-38.
 */
function leadOf({ band, danger }: TurnLabel, language: ReplyLanguage, advice: string | null) {
  switch (band) {
    case 'general': return advice ? `${advice}\n\n${lineOf('adviceHedge', language)} ` : `${lineOf('noted', language)} `
    case 'consequential': return `${lineOf('handoff', language)} `
    case 'out_of_scope': return `${lineOf('outOfScope', language)} `
    case 'adversarial': return `${lineOf('adversarial', language)} `
    case 'sensitive': return `${lineOf('sensitive', language)} ${danger ? `${lineOf('danger', language)} ` : ''}`
    // A question of the search gets its answer first, then the question of the interview (the founders, 2026-11-11).
    case 'core': return advice ? `${advice}\n\n` : ''
  }
}

/**
 * A scripted reply, with no model: what the turn filled, then one question (PD7a). The conflicts come first: the new ones,
 * and the open ones that the answer did not settle. Then each name of two areas, then an unclear must-have weight (PD15),
 * then the next empty or unclear slot.
 */
export async function replyWriter(
  turn: Pick<TurnState, 'form' | 'changed' | 'conflicts' | 'settled' | 'ambiguous' | 'failed' | 'last'> & { label: TurnLabel; language: ReplyLanguage }, deps: AssistantDeps, advice: string | null = null,
) {
  const { form, changed, conflicts, settled, ambiguous, failed, last, label, language } = turn
  return assistantReply.parse(await write(replyInput.parse({ form, changed, conflicts, settled, ambiguous, failed, last, label, language }), deps, advice))
}

const write = async (turn: z.output<typeof replyInput>, { db, settings }: AssistantDeps, advice: string | null) => {
  const catalogue = await catalogueOf(db)
  const lead = leadOf(turn.label, turn.language, advice)
  // A flatmate search asks the gender of the person right after the place type, and only then (the founders, 2026-11-11).
  const flatmates = intentsOf(turn.form).includes('flatmates')
  const order = flatmates ? ['intent' as const, 'gender' as const, ...settings.questionOrder.filter((slot) => slot !== 'intent' && slot !== 'gender')] : settings.questionOrder.filter((slot) => slot !== 'gender')
  const next = order.find((slot) => isOpenSlot(slotOf(turn.form, slot)))
  // Only a core turn asks the person to send the message again: never after a disclosure (T-34). A first turn keeps the chips of the empty chat.
  if (turn.failed && turn.label.band === 'core') return { text: lineOf('failed', turn.language), parts: turn.last ?? parts({ asked: null, question: null, chips: chipSlotOf(next) }) }
  // "A student" says "your days: student" too, so the reply names it once.
  const studentTwice = slotOf(turn.form, 'whosMoving').value === 'student' && turn.changed.includes('whosMoving')
  const filled = turn.changed.filter((slot) => slotOf(turn.form, slot).value !== 'unclear' && !(studentTwice && slot === 'lifestyle.your_days' && slotOf(turn.form, slot).value === 'student'))
  const ack = lead + (filled.length ? `${replyLines.ack(filled.map((slot) => valueText(slot, slotOf(turn.form, slot).value, catalogue)))} ` : '')
  /** The reply: the lead, what the turn filled, then the question. The turn keeps the question on its own for the next extractor. */
  const reply = (before: string, question: string, of: Omit<PartsOf, 'question'>) => ({
    text: before + (turn.label.band === 'out_of_scope' || advice ? backToIt(question, turn.language) : question),
    parts: parts({ ...of, question }),
  })

  const open = (turn.last?.conflicts ?? []).filter(({ slot }) => !turn.settled.includes(slot) && !turn.conflicts.some((c) => c.slot === slot))
  const conflicts = [...turn.conflicts, ...open]
  if (conflicts.length) {
    const lines = conflicts.map(({ slot, earlier, later }) => replyLines.conflict(valueText(slot, earlier, catalogue), valueText(slot, later, catalogue)))
    return reply(ack, lines.join(' '), { asked: { slot: conflicts[0]!.slot }, conflicts })
  }
  if (turn.ambiguous.length) {
    const lines = turn.ambiguous.map(({ words, slugs }) => replyLines.ambiguous(words, slugs.map((slug) => catalogue.bySlug.get(slug)?.name ?? slug)))
    return reply(ack, lines.join(' '), { asked: { slot: 'areas' } })
  }
  const unclearWeightSlot = mustHaveKeys.map((key) => `mustHaves.${key}` as const).find((slot) => slotOf(turn.form, slot).value === 'unclear')
  if (unclearWeightSlot) return reply(ack, replyLines.weight(catalogue.mustHaveLabels.get(slotPath(unclearWeightSlot)[1]!) ?? unclearWeightSlot), { asked: { slot: unclearWeightSlot }, chips: unclearWeightSlot })
  if (!next) return { text: ack + lineOf('done', turn.language), parts: parts({ asked: null, question: null }) }
  // "Not sure, help me pick" gets the help line, which ends with its own question (T-09).
  const question = next === 'intent' && slotOf(turn.form, 'intent').value === 'unclear' ? replyLines.helpPick : questionFor(next, catalogue)
  return reply(ack, question, { asked: { slot: next }, chips: chipSlotOf(next) })
}
