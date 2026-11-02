import { routerAnswer, routerInput, turnLabel, type RouterAnswer, type TurnLabel } from '@roomsie/contract'
import { nullIfUnavailable } from '../../../models/models'
import type { AssistantDeps, TurnState } from '../../assistant'
import { jsonListItem, jsonString, jsonTrue, passes } from '../gate'
import { turnMessage } from '../turn-message'
import { routerPrompt } from './prompt'

type Turn = Pick<TurnState, 'goalId' | 'text' | 'last'>
type Deps = Pick<AssistantDeps, 'req' | 'models' | 'settings'>

/**
 * The adapter of the router: a different model, such as Jev, is a different classifier (PD7a). Null: no answer.
 * `sure`: the band passes the threshold. The kinds and the flags of the answer hold only what passes it.
 */
type Classifier = (turn: Turn, deps: Deps) => Promise<{ answer: RouterAnswer; sure: boolean } | null>

/** The router on the model module (PD7). */
const modelClassifier: Classifier = async (turn, { req, models, settings }) => {
  if (!models) return null
  const input = routerInput.parse({ text: turn.text, lastQuestion: turn.last?.question ?? null })
  const scored = await models.scored({
    req, role: 'router', session: turn.goalId, schema: routerAnswer, system: routerPrompt, messages: [{ role: 'user', content: turnMessage(input) }],
  }).catch(nullIfUnavailable)
  if (!scored) return null
  const { value: answer } = scored
  const sure = (pattern: RegExp) => passes(scored, pattern, settings.routerMinProbability)
  // A guess never drops the answer of the extractor, and never goes into the log of PD3c (T-34).
  return {
    sure: sure(jsonString('band', answer.band)),
    answer: {
      ...answer,
      kinds: answer.kinds.filter((kind) => kind !== 'question' || sure(jsonListItem('kinds', 'question'))),
      danger: answer.danger && sure(jsonTrue('danger')),
      community: answer.community && sure(jsonTrue('community')),
    },
  }
}

const emptyCore = { kinds: [], band: 'core', danger: false, community: false }

/** The label of a typed turn. A band that is not sure, or no answer, makes the turn core, and the label keeps no kinds and no flags (T-34). */
export async function routeTurn(turn: Turn, deps: Deps): Promise<TurnLabel> {
  const result = await modelClassifier(turn, deps)
  if (!result) return turnLabel.parse({ ...emptyCore, routerBand: null, register: null })
  const { answer, sure } = result
  return turnLabel.parse(sure ? { ...answer, routerBand: answer.band } : { ...answer, ...emptyCore, routerBand: answer.band })
}
