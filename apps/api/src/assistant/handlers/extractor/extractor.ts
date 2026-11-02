import { extractorAnswer, extractorInput, extractorOutput, lifestyleAxes, mustHaveKeys, type AmbiguousArea, type FormA, type FormASlot } from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'
import { ModelUnavailable, vendorOf } from '../../../models/models'
import { catalogueOf, namesOf, saidIn } from '../../catalogue'
import { plainText } from '../../words'
import type { AssistantDeps, Handler, TurnState } from '../../assistant'
import { parseBudget } from './budget-words'
import { applyValues, type SlotValues } from './form-update'
import { probabilityOf } from './gate'
import { parseMoveDate } from './move-date-words'
import { extractorPrompt, extractorMessage } from './prompt'

/** Free text to Form A slots. The model only picks values and copies words. Code reads numbers and dates, and checks the probability (PD7). */
// The versioned schema checks the output (assistant.md).
export const extractor: Handler = async (turn, deps) => extractorOutput.parse(await extract(turn, deps))

/** The fields of a turn that the extractor did not change. `failed`: no model gave an answer. */
export const noExtraction = (form: FormA, failed: boolean) => ({ form, changed: [], conflicts: [], settled: [], ambiguous: [], failed })

/**
 * An answer to "which one should I keep?" that names no value (PD3b): a choice word alone, or with "wala" or "one",
 * as "doosra wala", "new one" or "pehla". A choice word inside a sentence, as "1st December", is no answer.
 */
const laterWords = 'doosra|dusra|doosri|dusri|doosre|dusre|second|2nd|new|naya|nayi|naye|latest|navin|दूसरा|दूसरी|दूसरे|दुसरा|दुसरी|दुसरे|दुसरं|नया|नई|नए|नवीन|नवा|नवं'
const earlierWords = 'pehla|pehli|pahla|pehle|first|1st|old|purana|purani|purane|earlier|previous|pahila|pahile|juna|पहला|पहली|पहले|पहिला|पहिले|पहिलं|पुराना|पुरानी|जुना|जुने|जुनं'
const answerOf = (words: string) => new RegExp(`^(?:keep )?(?:the )?(?:${words})(?: (?:wala|vala|wali|wale|one|वाला|वाली|वाले|rakho|ठेवा))?$`)
const laterAnswer = answerOf(laterWords)
const earlierAnswer = answerOf(earlierWords)
function choiceIn(text: string): 'earlier' | 'later' | null {
  const words = plainText(text)
  return laterAnswer.test(words) ? 'later' : earlierAnswer.test(words) ? 'earlier' : null
}

async function extract(turn: TurnState, { req, db, models, settings, today }: AssistantDeps) {
  const catalogue = await catalogueOf(db)
  if (!models) return noExtraction(turn.form, true)
  const input = extractorInput.parse({ text: turn.text, lastQuestion: turn.last?.question ?? null })
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
  // Copied words can come as byte tokens or as \u escapes, which the tokens do not match. Then only a low probability that matched leaves the slot empty.
  const wordsPass = (key: string, words: string) => {
    if (!tokens) return !unscored
    const probability = probabilityOf(tokens, key, words)
    return probability === null || probability >= settings.minProbability
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
  const areaQuestion = turn.last?.asked?.slot === 'areas' ? turn.last.question ?? '' : ''
  const namedInTurn = (slug: string) => {
    const area = catalogue.bySlug.get(slug)
    return !!area && namesOf(area).some((name) => saidIn(turn.text, name) || saidIn(areaQuestion, name))
  }
  const areas: string[] = []
  const ambiguous: AmbiguousArea[] = []
  for (const { words, slug } of answer.areas ?? []) {
    if (!saidIn(turn.text, words)) continue
    const named = catalogue.namesIn(words)
    for (const name of named) {
      if (name.slugs.length > 1) {
        if (!ambiguous.some((a) => a.words === name.words)) ambiguous.push(name)
      } else areas.push(name.slugs[0]!)
    }
    if (!named.length && slug && namedInTurn(slug) && passesGate('slug', slug)) areas.push(slug)
  }
  if (areas.length) values.areas = [...new Set(areas)]
  // Words with a low probability leave the slot empty: a budget or a date has no "unclear" value.
  const budget = answer.budget && saidIn(turn.text, answer.budget) && wordsPass('budget', answer.budget) ? parseBudget(answer.budget) : null
  if (budget) values.budget = budget
  const moveDate = answer.moveDate && saidIn(turn.text, answer.moveDate) && wordsPass('moveDate', answer.moveDate) ? parseMoveDate(answer.moveDate, today()) : null
  if (moveDate) values.moveDate = moveDate
  // The open conflicts: a value for the slot wins, or "doosra wala" or "pehla" picks one of the two values.
  const choice = choiceIn(turn.text)
  const settled: FormASlot[] = []
  const openConflicts = turn.last?.conflicts ?? []
  for (const { slot, earlier, later } of openConflicts) {
    // The model can call "doosra wala" unclear. The choice still picks the value.
    if ((values[slot] === undefined || values[slot] === 'unclear') && choice) values[slot] = choice === 'later' ? later : earlier
    if (values[slot] !== undefined && values[slot] !== 'unclear') settled.push(slot)
  }
  if (misaligned) reportError(new Error(unscored ? 'DeepSeek gave no token probabilities' : 'The token probabilities do not match the answer'), { where: 'assistant.extractor', log: req.log })

  return { ...applyValues(turn.form, values, openConflicts.map((c) => c.slot)), settled, ambiguous, failed: false }
}
