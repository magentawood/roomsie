import { advisorAnswer, advisorInput, type AdvisorInput } from '@roomsie/contract'
import { nullIfUnavailable } from '../../../models/models'
import type { AssistantDeps } from '../../assistant'
import { hasContact } from '../composer/check'
import { advisorPrompt } from './prompt'

/**
 * One selected card is "this place" or "this person" (the prompt). A model can still call it "Option 1", so code puts the words
 * in, with a capital at the start of a sentence or a point.
 */
export const asThisCard = (text: string, words: 'this place' | 'this person') =>
  text.replace(/Option 1\b/g, words).replace(/(^|\n|[.!?] )(- )?this (place|person)/g, (_, lead: string, point = '', noun: string) => `${lead}${point}This ${noun}`)

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
  const said = answer?.text.trim()
  if (!said) return null
  const text = data.cards?.length === 1 ? asThisCard(said, 'age' in data.cards[0]! ? 'this person' : 'this place') : said
  const failure = text.length > maxLength ? 'too_long' : hasContact(text) ? 'contact' : null
  if (!failure) return text
  req.log.info({ role: 'advisor', failure }, 'the text of the advisor failed the check')
  return null
}
