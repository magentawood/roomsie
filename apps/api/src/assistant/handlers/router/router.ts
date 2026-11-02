import { routerAnswer, routerInput, turnLabel, type RouterAnswer, type TurnLabel } from '@roomsie/contract'
import { nullIfUnavailable } from '../../../models/models'
import type { AssistantDeps, TurnState } from '../../assistant'
import { probabilityOf, unscoredDeepSeek } from '../extractor/gate'
import { extractorMessage } from '../extractor/prompt'
import { routerPrompt } from './prompt'

type Turn = Pick<TurnState, 'goalId' | 'text' | 'last'>
type Deps = Pick<AssistantDeps, 'req' | 'models' | 'settings'>

/** The adapter of the router: a different model, such as Jev, is a different classifier (PD7a). Null: no answer. */
type Classifier = (turn: Turn, deps: Deps) => Promise<{ answer: RouterAnswer; sure: boolean } | null>

/** The router on the model module (PD7). */
const modelClassifier: Classifier = async (turn, { req, models, settings }) => {
  if (!models) return null
  const input = routerInput.parse({ text: turn.text, lastQuestion: turn.last?.question ?? null })
  const scored = await models.scored({
    req, role: 'router', session: turn.goalId, schema: routerAnswer, system: routerPrompt, messages: [{ role: 'user', content: extractorMessage(input) }],
  }).catch(nullIfUnavailable)
  if (!scored) return null
  const { value: answer, tokens, model } = scored
  // As in the extractor: Gemini gives no probabilities, so its band passes.
  const probability = tokens && probabilityOf(tokens, 'band', answer.band)
  return { answer, sure: tokens ? probability !== null && probability >= settings.routerMinProbability : !unscoredDeepSeek(tokens, model) }
}

const classify: Classifier = modelClassifier

const noLabel = { kinds: [], danger: false, community: false }

/** The label of a typed turn. A band that is not sure, or no answer, makes the turn core, and the label keeps no kinds and no flags (T-34). */
export async function routeTurn(turn: Turn, deps: Deps): Promise<TurnLabel> {
  const result = await classify(turn, deps)
  if (!result) return turnLabel.parse({ ...noLabel, band: 'core', routerBand: null, register: null })
  const { answer, sure } = result
  return turnLabel.parse(sure ? { ...answer, routerBand: answer.band } : { ...answer, ...noLabel, band: 'core', routerBand: answer.band })
}
