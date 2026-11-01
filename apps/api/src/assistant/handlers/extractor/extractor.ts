import { extractorAnswer, extractorInput, extractorOutput, lifestyleAxes, mustHaveKeys, type AmbiguousArea, type FormASlot } from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'
import { ModelUnavailable } from '../../../models/models'
import { catalogueOf, saidIn } from '../../catalogue'
import type { AssistantDeps, Handler, Turn } from '../../assistant'
import { parseBudget } from './budget-words'
import { applyValues, type SlotValues } from './form-update'
import { probabilityOf } from './gate'
import { parseMoveDate } from './move-date-words'
import { extractorPrompt, extractorMessage } from './prompt'

/** Free text to Form A slots. The model only picks values and copies words. Code reads numbers and dates, and checks the probability (PD7). */
/** The version of the output names its schema in the contract. The turn keeps only the fields. */
export const extractor: Handler = async (turn, deps) => extractorOutput.omit({ version: true }).parse(await extract(turn, deps))

const noAnswer = (turn: Turn) => ({ form: turn.form, changed: [], conflicts: [], ambiguous: null, failed: true })

async function extract(turn: Turn, { req, db, models, settings, today }: AssistantDeps) {
  const catalogue = await catalogueOf(db)
  if (!models) return noAnswer(turn)
  const input = extractorInput.parse({ text: turn.text, lastQuestion: turn.lastQuestion })
  const scored = await models.scored({
    req, role: 'extractor', session: turn.goalId, schema: extractorAnswer,
    system: extractorPrompt(catalogue), messages: [{ role: 'user', content: extractorMessage(input) }],
  }).catch((err: unknown) => {
    if (err instanceof ModelUnavailable) return null
    throw err
  })
  if (!scored) return noAnswer(turn)
  const { value: answer, tokens } = scored

  let misaligned = false
  /** Gemini gives no probabilities, so its values pass. A value that the tokens do not hold is unclear (T-12). */
  const passesGate = (key: string, value: string) => {
    if (!tokens || value === 'unclear') return true
    const probability = probabilityOf(tokens, key, value)
    if (probability === null) misaligned = true
    return probability !== null && probability >= settings.minProbability
  }
  const values: SlotValues = {}
  const putValue = (slot: FormASlot, key: string, value: string | null | undefined) => {
    if (value != null) values[slot] = passesGate(key, value) ? value : 'unclear'
  }
  putValue('intent', 'intent', answer.intent)
  putValue('roomType', 'roomType', answer.roomType)
  putValue('whosMoving', 'whosMoving', answer.whosMoving)
  for (const axis of lifestyleAxes) putValue(`lifestyle.${axis}`, axis, answer.lifestyle?.[axis])
  for (const key of mustHaveKeys) putValue(`mustHaves.${key}`, key, answer.mustHaves?.[key])

  // A name that the seed knows gives its areas, whatever slug the model picked. A name of two areas asks.
  // A different slug counts only if its name is in the turn, or in the area question, as in "both" after "Which Andheri?".
  const areaQuestion = turn.asked?.slot === 'areas' ? turn.lastQuestion ?? '' : ''
  const namedInTurn = (slug: string) => {
    const area = catalogue.bySlug.get(slug)
    return !!area && [area.name, ...area.aliases].some((name) => saidIn(turn.text, name) || saidIn(areaQuestion, name))
  }
  const areas: string[] = []
  let ambiguous: AmbiguousArea | null = null
  for (const { words, slug } of answer.areas ?? []) {
    if (!saidIn(turn.text, words)) continue
    const seeded = catalogue.areasNamed(words)
    if (seeded.length > 1) ambiguous ??= { words, slugs: seeded }
    else if (seeded.length === 1) areas.push(seeded[0]!)
    else if (slug && namedInTurn(slug) && passesGate('slug', slug)) areas.push(slug)
  }
  if (areas.length) values.areas = areas
  const budget = answer.budget && saidIn(turn.text, answer.budget) ? parseBudget(answer.budget) : null
  if (budget) values.budget = budget
  const moveDate = answer.moveDate && saidIn(turn.text, answer.moveDate) ? parseMoveDate(answer.moveDate, today()) : null
  if (moveDate) values.moveDate = moveDate
  if (misaligned) reportError(new Error('The token probabilities do not match the answer'), { where: 'assistant.extractor', log: req.log })

  return { ...applyValues(turn.form, values, turn.asked?.conflict ? turn.asked.slot : null), ambiguous, failed: false }
}
