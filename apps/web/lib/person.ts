import { mustHaveKeys, type CardResponse, type Connection, type LifestyleAxis } from '@roomsie/contract'
import { profileLabels } from './profile-form'

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
    return answer ? [{ label: axisLabel(axis), value: (profileLabels.answers[axis] as Record<string, string>)[answer]! }] : []
  })

/** "Veg • Non-smoker • Home most days +2", for the person card. */
export function lifestyleSummary(card: CardResponse, shown = 3) {
  const values = lifestyleLines(card).map((l) => l.value)
  if (!values.length) return null
  const more = values.length - shown
  return values.slice(0, shown).join(' • ') + (more > 0 ? ` +${more}` : '')
}

export const mustHaveGroups = (card: CardResponse) => ({
  dealbreakers: mustHaveKeys.filter((k) => card.mustHaves[k] === 'dealbreaker').map((k) => profileLabels.mustHaves[k]),
  prefers: mustHaveKeys.filter((k) => card.mustHaves[k] === 'prefer').map((k) => profileLabels.mustHaves[k]),
})

export type ConnectView = { kind: 'say_hi' | 'say_hi_again' | 'sent' | 'received' | 'chat'; disabled: boolean; line: string | null }
/** The connect button of the person detail, and the line under it (PD17). */
export function connectView(connection: Connection, requestsLeftToday: number, name: string): ConnectView {
  const capped = requestsLeftToday === 0
  const capLine = 'You can send 10 new requests a day. Try again tomorrow.'
  switch (connection.state) {
    case 'none': return { kind: 'say_hi', disabled: capped, line: capped ? capLine : null }
    case 'not_available': return { kind: 'say_hi_again', disabled: capped, line: `${name} isn’t available right now. You can send ${name} a new request later.` }
    case 'sent': return { kind: 'sent', disabled: true, line: `Waiting for ${name} to accept. Requests close after 14 days.` }
    case 'received': return { kind: 'received', disabled: false, line: `${name} sent you a request` }
    case 'accepted': return { kind: 'chat', disabled: true, line: 'You’re connected. The chat opens here when Messages is ready.' }
  }
}
