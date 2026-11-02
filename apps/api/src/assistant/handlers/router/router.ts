import { routerAnswer, routerInput, turnLabel, type RouterAnswer, type TurnLabel } from '@roomsie/contract'
import { ModelUnavailable, vendorOf } from '../../../models/models'
import type { AssistantDeps, TurnState } from '../../assistant'
import { probabilityOf } from '../extractor/gate'
import { extractorMessage } from '../extractor/prompt'
import { routerPrompt } from './prompt'

type Turn = Pick<TurnState, 'goalId' | 'text' | 'last'>

/** The adapter of the router: a different model, such as Jev, is a different classifier (PD7a). Null: no answer. */
type Classifier = (turn: Turn, deps: AssistantDeps) => Promise<{ answer: RouterAnswer; sure: boolean } | null>

/** The router on the model module. The band is sure from the token probabilities of DeepSeek, as in the extractor (PD7). */
const modelClassifier: Classifier = async (turn, { req, models, settings }) => {
  if (!models) return null
  const input = routerInput.parse({ text: turn.text, lastQuestion: turn.last?.question ?? null })
  const scored = await models.scored({
    req, role: 'router', session: turn.goalId, schema: routerAnswer, system: routerPrompt, messages: [{ role: 'user', content: extractorMessage(input) }],
  }).catch((err: unknown) => {
    if (err instanceof ModelUnavailable) return null
    throw err
  })
  if (!scored) return null
  const { value: answer, tokens, model } = scored
  // Gemini gives no probabilities, so its band passes. DeepSeek with no probabilities is not sure.
  const probability = tokens && probabilityOf(tokens, 'band', answer.band)
  const sure = tokens ? probability !== null && probability >= settings.routerMinProbability : vendorOf(model) !== 'deepseek'
  return { answer, sure }
}

const classify: Classifier = modelClassifier

/** The label of a typed turn. A band that is not sure, or no answer, makes the turn core (T-34). */
export async function routeTurn(turn: Turn, deps: AssistantDeps): Promise<TurnLabel> {
  const result = await classify(turn, deps)
  if (!result) return turnLabel.parse({ kinds: [], band: 'core', said: null, register: null, danger: false, community: false })
  return turnLabel.parse({ ...result.answer, band: result.sure ? result.answer.band : 'core', said: result.answer.band })
}
