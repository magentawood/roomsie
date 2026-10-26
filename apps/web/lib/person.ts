import { mustHaveKeys, requestCapMessage, requestExpiryDays, type CardResponse, type Connection, type LifestyleAxis } from '@roomsie/contract'
import { rupees } from './listing-steps'
import { profileLabels } from './profile-form'

export const initials = (fullName: string) => fullName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
export const aboutLine = (card: Pick<CardResponse, 'jobRole' | 'age'>) => [card.jobRole, card.age && `${card.age} yrs`].filter(Boolean).join(' • ')

const intentLabels: Record<Exclude<CardResponse['intent'], 'unclear'>, string> = {
  room: 'Room in a flat', pg: 'PG', whole_flat: 'A whole flat', flatmates: 'Flat with flatmates',
}
export const lookingFor = (card: CardResponse) => (card.intent === 'unclear' ? null : intentLabels[card.intent])

export function budgetLine({ budgetMin: min, budgetMax: max }: Pick<CardResponse, 'budgetMin' | 'budgetMax'>) {
  if (min !== null && max !== null) return `${rupees(min)} to ${rupees(max)}`
  if (max !== null) return `Under ${rupees(max)}`
  return min === null ? null : `From ${rupees(min)}`
}

/** The answers of another person: the designs say "Their days", not "Your days". */
const axisLabel = (axis: LifestyleAxis) => (axis === 'your_days' ? 'Their days' : profileLabels.axes[axis])
export const lifestyleLines = (card: CardResponse) => (Object.keys(profileLabels.axes) as LifestyleAxis[])
  .flatMap((axis) => {
    const answer = card.lifestyle[axis]
    return answer ? [{ axis, label: axisLabel(axis), value: (profileLabels.answers[axis] as Record<string, string>)[answer]! }] : []
  })

/** "Veg • Non-smoker • Home most days +2", for the person card. */
export function lifestyleSummary(card: CardResponse) {
  const values = lifestyleLines(card).map((l) => l.value)
  if (!values.length) return null
  const more = values.length - 3
  return values.slice(0, 3).join(' • ') + (more > 0 ? ` +${more}` : '')
}

export const mustHaveGroups = (card: CardResponse) => ({
  dealbreakers: mustHaveKeys.filter((k) => card.mustHaves[k] === 'dealbreaker').map((k) => profileLabels.mustHaves[k]),
  prefers: mustHaveKeys.filter((k) => card.mustHaves[k] === 'prefer').map((k) => profileLabels.mustHaves[k]),
})

/** The line under the connect button (PD17). A viewer at the daily cap learns why Say hi is disabled. */
export function connectLine(connection: Connection, requestsLeftToday: number, name: string) {
  const canSayHi = connection.state === 'none' || connection.state === 'not_available'
  if (canSayHi && requestsLeftToday === 0) return requestCapMessage
  switch (connection.state) {
    case 'none': return null
    case 'not_available': return `${name} isn’t available right now. You can send ${name} a new request later.`
    case 'sent': return `Waiting for ${name} to accept. Requests close after ${requestExpiryDays} days.`
    case 'received': return `${name} sent you a request`
    case 'accepted': return 'You’re connected. The chat opens here when Messages is ready.'
  }
}
