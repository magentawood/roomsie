import { extractorAnswer, lifestyleAnswers, mustHaveKeys, type FormASlot, type LifestyleAxis } from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'
import { ModelUnavailable, type Token } from '../../../models/models'
import { catalogueOf, saidIn } from '../../catalogue'
import type { Handler } from '../../assistant'
import { parseBudget } from './budget-words'
import { applyValues, type SlotValues } from './form-update'
import { probabilityOf } from './gate'
import { parseMoveDate } from './move-date-words'
import { extractorPrompt, extractorMessage } from './prompt'

/** The date of today in Mumbai. */
export const todayInIst = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

/** Free text to Form A slots. The model only picks values and copies words. Code reads numbers and dates, and checks the probability (PD7). */
export const extractor: Handler = async (turn, { db, models, settings, today }) => {
  const catalogue = await catalogueOf(db)
  if (!models) return { failed: true }
  let scored: { value: typeof extractorAnswer._output; tokens: Token[] | null }
  try {
    scored = await models.scored({
      req: turn.req, role: 'extractor', session: turn.goalId, schema: extractorAnswer,
      system: extractorPrompt(catalogue), messages: [{ role: 'user', content: extractorMessage(turn.text, turn.lastQuestion) }],
    })
  } catch (err) {
    if (err instanceof ModelUnavailable) return { failed: true }
    throw err
  }
  const { value: answer, tokens } = scored

  let misaligned = false
  /** Gemini gives no probabilities, so its values pass (T-12). */
  const sure = (key: string, value: string) => {
    if (!tokens || value === 'unclear') return true
    const found = probabilityOf(tokens, key, value)
    if (!found) misaligned = true
    return !found || found.probability >= settings.minProbability
  }
  const values: SlotValues = {}
  const pick = (slot: FormASlot, key: string, value: string | null | undefined) => {
    if (value != null) values[slot] = sure(key, value) ? value : 'unclear'
  }
  pick('intent', 'intent', answer.intent)
  pick('roomType', 'roomType', answer.roomType)
  pick('whosMoving', 'whosMoving', answer.whosMoving)
  for (const axis of Object.keys(lifestyleAnswers) as LifestyleAxis[]) pick(`lifestyle.${axis}`, axis, answer.lifestyle?.[axis])
  for (const key of mustHaveKeys) pick(`mustHaves.${key}`, key, answer.mustHaves?.[key])

  // A name that the seed knows gives its areas, whatever slug the model picked. A name of two areas asks.
  const areas: string[] = []
  let ambiguous: { words: string; slugs: string[] } | null = null
  for (const { words, slug } of answer.areas ?? []) {
    if (!saidIn(turn.text, words)) continue
    const named = catalogue.areasNamed(words)
    if (named.length > 1) ambiguous ??= { words, slugs: named }
    else if (named.length === 1) areas.push(named[0]!)
    else if (slug && catalogue.names.has(slug) && sure('slug', slug)) areas.push(slug)
  }
  if (areas.length) values.areas = areas
  const budget = answer.budget && saidIn(turn.text, answer.budget) ? parseBudget(answer.budget) : null
  if (budget) values.budget = budget
  const moveDate = answer.moveDate && saidIn(turn.text, answer.moveDate) ? parseMoveDate(answer.moveDate, today()) : null
  if (moveDate) values.moveDate = moveDate
  if (misaligned) reportError(new Error('The token probabilities do not match the answer'), { where: 'assistant.extractor', log: turn.req.log })

  const update = applyValues(turn.form, values, turn.asked?.conflict ? turn.asked.slot : null)
  for (const { slot } of update.conflicts) turn.req.server.analytics.track(turn.req, { name: 'slot_conflict', slot })
  return { ...update, ambiguous }
}
