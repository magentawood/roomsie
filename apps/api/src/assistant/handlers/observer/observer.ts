import { observerAnswer, observerInput, observerOutput, type ObserverOutput } from '@roomsie/contract'
import { nullIfUnavailable, type Token } from '../../../models/models'
import { activeTopics } from '../../../observations/read'
import type { AssistantDeps, TurnState } from '../../assistant'
import { quoteIn } from '../../words'
import { reportError } from '@roomsie/config/report'
import { escapeRegExp, jsonField, jsonString, probabilityOfMatch, unscoredDeepSeek } from '../gate'
import { turnMessage } from '../turn-message'
import { observerPrompt } from './prompt'

type Note = ObserverOutput['notes'][number]
type ObserverTurn = Pick<TurnState, 'goalId' | 'text' | 'last'>
export type ObserverDeps = Pick<AssistantDeps, 'req' | 'db' | 'models' | 'settings'>

/** The probability of the topic and the kind of a note, from the tokens of the answer (PD3b). Null: the tokens do not hold them. */
function confidenceOf(tokens: Token[], { key, kind }: Pick<Note, 'key' | 'kind'>) {
  const keyPart = jsonField('key', escapeRegExp(key))
  const kindPart = jsonField('kind', `(${escapeRegExp(kind)})`)
  const kindP = probabilityOfMatch(tokens, new RegExp(`${keyPart}[^{}]*${kindPart}`)) ?? probabilityOfMatch(tokens, new RegExp(`${kindPart}[^{}]*${keyPart}`))
  const keyP = probabilityOfMatch(tokens, jsonString('key', key))
  return kindP === null || keyP === null ? null : keyP * kindP
}

/**
 * The Form B notes of one typed turn (PD7a). A note needs a topic of the catalogue and a quote that the turn holds word for word.
 * `rejected`: the notes with a quote that the turn does not hold.
 */
export async function observer(turn: ObserverTurn, deps: ObserverDeps) {
  return observerOutput.parse(await observe(turn, deps))
}

async function observe(turn: ObserverTurn, { req, db, models, settings }: ObserverDeps) {
  if (!models) return { notes: [], rejected: 0 }
  const topics = await activeTopics(db)
  const input = observerInput.parse({ text: turn.text, lastQuestion: turn.last?.question ?? null })
  const scored = await models.scored({
    req, role: 'observer', session: turn.goalId, schema: observerAnswer, system: observerPrompt(topics), messages: [{ role: 'user', content: turnMessage(input) }],
  }).catch(nullIfUnavailable)
  if (!scored) return { notes: [], rejected: 0 }
  const keys = new Set(topics.map(({ key }) => key))
  const notes: Note[] = []
  let rejected = 0
  let misaligned = unscoredDeepSeek(scored.tokens, scored.model)
  for (const note of scored.value.notes) {
    if (!keys.has(note.key) || notes.some(({ key }) => key === note.key)) continue
    const evidence = quoteIn(turn.text, note.evidence)
    if (!evidence) {
      rejected++
      continue
    }
    // Gemini gives no probabilities (T-12).
    const measured = scored.tokens ? confidenceOf(scored.tokens, note) : undefined
    if (measured === null) misaligned = true
    const confidence = measured ?? settings.unscoredConfidence
    notes.push({ key: note.key, kind: note.kind, value: note.value, evidence, confidence })
  }
  if (misaligned) reportError(new Error(scored.tokens ? 'The token probabilities do not match the notes' : 'DeepSeek gave no token probabilities'), { where: 'assistant.observer', log: req.log })
  return { notes, rejected }
}
