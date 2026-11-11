import { locatorAnswer, locatorInput } from '@roomsie/contract'
import { nullIfUnavailable } from '../../../models/models'
import { areaSpot, placeNamed, type Spot } from '../../../geo/geo'
import type { AssistantDeps } from '../../assistant'
import { locatorPrompt } from './prompt'

/**
 * The places of a question about a distance, when the map of roomsie lacks one of them (the founders, 2026-11-11): a model names
 * each place and picks its area. A name that the map has, all of it, takes its own point, as "mgm clg" written as "MGM College",
 * and any other name the point of its area. A place with no area is left out. Null: no answer before the deadline.
 */
export async function locate(goalId: string, question: string, { req, models, settings }: Pick<AssistantDeps, 'req' | 'models' | 'settings'>): Promise<Spot[] | null> {
  if (!models) return null
  const answer = await models.json({
    req, role: 'locator', session: goalId, schema: locatorAnswer, system: locatorPrompt,
    messages: [{ role: 'user', content: JSON.stringify(locatorInput.parse({ version: 1, question })) }], deadlineMs: settings.locatorDeadlineMs,
  }).catch(nullIfUnavailable)
  return answer && answer.places.flatMap(({ name, area }) => {
    const spot = placeNamed(name) ?? (area ? areaSpot(name, area) : null)
    return spot ? [spot] : []
  })
}
