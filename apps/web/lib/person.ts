import { mustHaveKeys, requestDailyLimit, requestExpiryDays, type CardResponse, type Connection, type LifestyleAxis } from '@roomsie/contract'
import { profileLabels } from './profile-form'

export const initials = (fullName: string) => fullName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
/** "Business analyst • 26 yrs". */
export const aboutLine = (card: Pick<CardResponse, 'jobRole' | 'age'>) => [card.jobRole, card.age && `${card.age} yrs`].filter(Boolean).join(' • ')

const intentLabels: Record<Exclude<CardResponse['intent'], 'unclear'>, string> = {
  room: 'Room in a flat', pg: 'PG', whole_flat: 'A whole flat', flatmates: 'Flat with flatmates',
}
export const lookingFor = (card: CardResponse) => (card.intent === 'unclear' ? null : intentLabels[card.intent])

const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN')}`
export function budgetLine(min: number | null, max: number | null) {
  if (min !== null && max !== null) return `${rupees(min)} to ${rupees(max)}`
  if (max !== null) return `Up to ${rupees(max)}`
  return min === null ? null : `From ${rupees(min)}`
}

/** "1 Nov 26". The date has no time, so the time zone of the browser must not move it. */
export const moveLine = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' })

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
  if (canSayHi && requestsLeftToday === 0) return `You can send ${requestDailyLimit} new requests a day. Try again tomorrow.`
  switch (connection.state) {
    case 'none': return null
    case 'not_available': return `${name} isn’t available right now. You can send ${name} a new request later.`
    case 'sent': return `Waiting for ${name} to accept. Requests close after ${requestExpiryDays} days.`
    case 'received': return `${name} sent you a request`
    case 'accepted': return 'You’re connected. The chat opens here when Messages is ready.'
  }
}
