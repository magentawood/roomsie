import { advisorAnswer, advisorInput, type AdvisorInput } from '@roomsie/contract'
import { nullIfUnavailable } from '../../../models/models'
import type { AssistantDeps } from '../../assistant'
import { hasContact } from '../composer/check'
import { advisorPrompt } from './prompt'

/** The longest answer that the check lets through: five short points, also in Devanagari. */
const maxLength = 900

/**
 * The answer to a general question of band 2a, from model knowledge (PD10). The corpus and the web search after a sign-in come with T-38.
 * Null: no answer before the deadline, an empty answer, or a text that fails the check. Then the line "I've noted it" goes out.
 */
export async function advisor(goalId: string, input: AdvisorInput, { req, models, settings }: Pick<AssistantDeps, 'req' | 'models' | 'settings'>) {
  if (!models) return null
  const data = advisorInput.parse(input)
  const answer = await models.json({
    req, role: 'advisor', session: goalId, schema: advisorAnswer, system: advisorPrompt,
    messages: [{ role: 'user', content: JSON.stringify(data) }], deadlineMs: settings.advisorDeadlineMs,
  }).catch(nullIfUnavailable)
  const text = answer?.text.trim()
  if (!text) return null
  const failure = text.length > maxLength ? 'too_long' : hasContact(text) ? 'contact' : null
  if (!failure) return text
  req.log.info({ role: 'advisor', failure }, 'the text of the advisor failed the check')
  return null
}
