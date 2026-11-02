import { routerAnswer, routerInput, turnLabel, type RouterAnswer, type TurnLabel } from '@roomsie/contract'
import { nullIfUnavailable } from '../../../models/models'
import type { AssistantDeps, TurnState } from '../../assistant'
import { probabilityAt, unscoredDeepSeek } from '../gate'
import { turnMessage } from '../turn-message'
import { routerPrompt } from './prompt'

type Turn = Pick<TurnState, 'goalId' | 'text' | 'last'>
type Deps = Pick<AssistantDeps, 'req' | 'models' | 'settings'>
/** `sure`: the band passes the threshold. The kinds and the flags of the answer hold only what passes it. */
type Classified = { answer: RouterAnswer; sure: boolean }

/** The adapter of the router: a different model, such as Jev, is a different classifier (PD7a). Null: no answer. */
type Classifier = (turn: Turn, deps: Deps) => Promise<Classified | null>

/** The router on the model module (PD7). */
const modelClassifier: Classifier = async (turn, { req, models, settings }) => {
  if (!models) return null
  const input = routerInput.parse({ text: turn.text, lastQuestion: turn.last?.question ?? null })
  const scored = await models.scored({
    req, role: 'router', session: turn.goalId, schema: routerAnswer, system: routerPrompt, messages: [{ role: 'user', content: turnMessage(input) }],
  }).catch(nullIfUnavailable)
  if (!scored) return null
  const { value: answer, tokens, model } = scored
  const passes = (pattern: RegExp) => (tokens ? (probabilityAt(tokens, pattern) ?? 0) >= settings.routerMinProbability : !unscoredDeepSeek(tokens, model))
  // A guess never drops the answer of the extractor, and never goes into the log of PD3c (T-34).
  return {
    sure: passes(new RegExp(`"band"\\s*:\\s*"(${answer.band})"`, 'd')),
    answer: {
      ...answer,
      kinds: answer.kinds.filter((kind) => kind !== 'question' || passes(/"kinds"\s*:\s*\[[^\]]*"(question)"/d)),
      danger: answer.danger && passes(/"danger"\s*:\s*(true)/d),
      community: answer.community && passes(/"community"\s*:\s*(true)/d),
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
