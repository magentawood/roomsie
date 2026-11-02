import { extractorAnswer, extractorInput, extractorOutput, lifestyleAxes, mustHaveKeys, type AmbiguousArea, type FormA, type FormASlot } from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'
import { ModelUnavailable, vendorOf } from '../../../models/models'
import { catalogueOf, namesOf, saidIn } from '../../catalogue'
import type { AssistantDeps, Handler, TurnState } from '../../assistant'
import { parseBudget } from './budget-words'
import { applyValues, type SlotValues } from './form-update'
import { probabilityOf } from './gate'
import { parseMoveDate } from './move-date-words'
import { extractorPrompt, extractorMessage } from './prompt'

/** Free text to Form A slots. The model only picks values and copies words. Code reads numbers and dates, and checks the probability (PD7). */
export const extractor: Handler = async (turn, deps) => extractorOutput.omit({ version: true }).parse(await extract(turn, deps))

/** The fields of a turn that the extractor did not change. `failed`: no model gave an answer. */
export const noExtraction = (form: FormA, failed: boolean) => ({ form, changed: [], conflicts: [], ambiguous: [], failed })

async function extract(turn: TurnState, { req, db, models, settings, today }: AssistantDeps) {
  const catalogue = await catalogueOf(db)
  if (!models) return noExtraction(turn.form, true)
  const input = extractorInput.parse({ text: turn.text, lastQuestion: turn.lastQuestion })
  const scored = await models.scored({
    req, role: 'extractor', session: turn.goalId, schema: extractorAnswer,
    system: extractorPrompt(catalogue), messages: [{ role: 'user', content: extractorMessage(input) }],
  }).catch((err: unknown) => {
    if (err instanceof ModelUnavailable) return null
    throw err
  })
  if (!scored) return noExtraction(turn.form, true)
  const { value: answer, tokens, model } = scored

  // Gemini gives no probabilities, so its values pass. DeepSeek with no probabilities, or a value that its tokens do not hold, is unclear (T-12).
  const unscored = !tokens && vendorOf(model) === 'deepseek'
  let misaligned = unscored
  const passesGate = (key: string, value: string) => {
    if (value === 'unclear') return true
    if (!tokens) return !unscored
    const probability = probabilityOf(tokens, key, value)
    if (probability === null) misaligned = true
    return probability !== null && probability >= settings.minProbability
  }
  const values: SlotValues = {}
  const putValue = (slot: FormASlot, key: string, value: string | null | undefined) => {
    if (value != null) values[slot] = passesGate(key, value) ? value : 'unclear'
  }
  for (const slot of ['intent', 'roomType', 'whosMoving'] as const) putValue(slot, slot, answer[slot])
  for (const axis of lifestyleAxes) putValue(`lifestyle.${axis}`, axis, answer.lifestyle?.[axis])
  for (const key of mustHaveKeys) putValue(`mustHaves.${key}`, key, answer.mustHaves?.[key])

  // A seeded name in the words gives its areas, whatever slug the model picked, also inside longer words as "Andheri station".
  // A name of two areas asks. A different slug counts only if its name is in the turn, or in the area question, as in "both" after "Which Andheri?".
  const areaQuestion = turn.asked?.slot === 'areas' ? turn.lastQuestion ?? '' : ''
  const namedInTurn = (slug: string) => {
    const area = catalogue.bySlug.get(slug)
    return !!area && namesOf(area).some((name) => saidIn(turn.text, name) || saidIn(areaQuestion, name))
  }
  const areas: string[] = []
  const ambiguous: AmbiguousArea[] = []
  for (const { words, slug } of answer.areas ?? []) {
    if (!saidIn(turn.text, words)) continue
    const exact = catalogue.areasNamed(words)
    const named = exact.length ? [{ words, slugs: exact }] : catalogue.namesIn(words)
    for (const name of named) {
      if (name.slugs.length > 1) {
        if (!ambiguous.some((a) => a.words === name.words)) ambiguous.push(name)
      } else areas.push(name.slugs[0]!)
    }
    if (!named.length && slug && namedInTurn(slug) && passesGate('slug', slug)) areas.push(slug)
  }
  if (areas.length) values.areas = [...new Set(areas)]
  const budget = answer.budget && saidIn(turn.text, answer.budget) ? parseBudget(answer.budget) : null
  if (budget) values.budget = budget
  const moveDate = answer.moveDate && saidIn(turn.text, answer.moveDate) ? parseMoveDate(answer.moveDate, today()) : null
  if (moveDate) values.moveDate = moveDate
  if (misaligned) reportError(new Error(unscored ? 'DeepSeek gave no token probabilities' : 'The token probabilities do not match the answer'), { where: 'assistant.extractor', log: req.log })

  return { ...applyValues(turn.form, values, turn.asked?.conflict ? turn.asked.slot : null), ambiguous, failed: false }
}
