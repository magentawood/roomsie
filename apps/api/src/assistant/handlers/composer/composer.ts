import { composerAnswer, composerInput, composerOutput, type ComposerInput } from '@roomsie/contract'
import { nullIfUnavailable } from '../../../models/models'
import type { AssistantDeps } from '../../assistant'
import { passesCheck } from './check'
import { composerPrompt } from './prompt'

/** Null: no answer before the deadline, or a text that fails the check. Then the scripted reply goes out (PD7a). */
export async function composer(goalId: string, input: ComposerInput, { req, models, settings }: Pick<AssistantDeps, 'req' | 'models' | 'settings'>) {
  if (!models) return null
  const data = composerInput.parse(input)
  const answer = await models.json({
    req, role: 'composer', session: goalId, schema: composerAnswer, system: composerPrompt,
    messages: [{ role: 'user', content: JSON.stringify(data) }], deadlineMs: settings.composerDeadlineMs,
  }).catch(nullIfUnavailable)
  if (!answer) return null
  if (passesCheck(answer.text, data)) return composerOutput.parse({ text: answer.text })
  req.log.info({ role: 'composer' }, 'the text of the composer failed the check')
  return null
}
