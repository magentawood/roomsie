import type { FormA, MatchResult, MustHaveKey } from '@roomsie/contract'
import { rupees } from './listing-steps'

/** What the match query gives the panel. TODO(T-14): the response schema of the match route replaces this type. */
export type ResultsPage = { results: MatchResult[]; suggested: MatchResult[] }

type Slot = FormA['intent'] | FormA['areas'] | FormA['budget']
const known = <S extends Slot>(slot: S) => (slot.source === 'empty' || slot.value === 'unclear' ? null : slot.value as Exclude<S['value'], 'unclear' | null>)

/** The panel shows first when the person gave intent, area and budget (PD6c, interface-shape.md hole 3). */
export const panelReady = (form: FormA) => Boolean(known(form.intent) && known(form.areas) && known(form.budget))

const nouns: Record<Exclude<FormA['intent']['value'], 'unclear' | null>, string> = { room: 'Rooms', pg: 'PGs', whole_flat: 'Flats', flatmates: 'People' }

function areaPhrase(slugs: readonly string[], label: (slug: string) => string) {
  const [first, second, ...rest] = slugs.map(label)
  if (!second) return first!
  return rest.length ? `${first}, ${second} and ${rest.length} more` : `${first} and ${second}`
}

function budgetPhrase({ min, max }: { min: number | null; max: number | null }) {
  if (min !== null && max !== null) return `${rupees(min)} to ${rupees(max)}`
  return max !== null ? `under ${rupees(max)}` : `from ${rupees(min!)}`
}

/** The scope of the header: "Everything in Mumbai", then "Flats in Powai–Vikhroli", then "… under ₹20,000" (drafts section 14). */
export function panelTitle(form: FormA, label: (slug: string) => string) {
  const intent = known(form.intent)
  const areas = known(form.areas)
  const budget = known(form.budget)
  const scope = `${intent ? nouns[intent] : 'Everything'} in ${areas ? areaPhrase(areas, label) : 'Mumbai'}`
  return budget ? `${scope} ${budgetPhrase(budget)}` : scope
}

/** The name of an area: from the API, or from its slug while the names load ("powai-vikhroli" reads "Powai Vikhroli"). */
export const areaName = (labels: Record<string, string>) => (slug: string) =>
  labels[slug] ?? slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

export const countLine = (n: number) => `${n} ${n === 1 ? 'result' : 'results'}`

/**
 * The panel is a pure function of the form (PD6c): the values and the weights, never the sources.
 * Thus a stated value that confirms a default gives the same key, and no new query.
 */
export function formKey(form: FormA) {
  const value = (slot: { value: unknown }) => slot.value
  return JSON.stringify([
    value(form.intent), value(form.roomType), value(form.whosMoving), value(form.areas), value(form.budget), value(form.moveDate),
    Object.entries(form.lifestyle).map(([axis, slot]) => [axis, value(slot)]),
    Object.entries(form.mustHaves).map(([key, slot]) => [key, value(slot)]),
  ])
}

/** The answer that a card did not give, for each dealbreaker: a person answers a lifestyle question, a listing has a house rule (PD3a). */
const unanswered: Record<MatchResult['kind'], Record<MustHaveKey, string>> = {
  person: {
    veg_kitchen: 'food', non_smokers: 'smoking', no_alcohol: 'drinks', tidy_flatmates: 'tidiness',
    women_only: 'gender', men_only: 'gender', couple_friendly: 'couples',
  },
  listing: {
    veg_kitchen: 'kitchen', non_smokers: 'smoking', no_alcohol: 'alcohol', tidy_flatmates: 'tidiness',
    women_only: 'who can move in', men_only: 'who can move in', couple_friendly: 'who’s welcome',
  },
}

/** "Didn't say: smoking" of drafts section 14. Two keys can name one answer, so each answer shows once. */
export function didntSayLine(result: MatchResult) {
  if (!result.didntSay.length) return null
  return `Didn’t say: ${[...new Set(result.didntSay.map((key) => unanswered[result.kind][key]))].join(', ')}`
}

export const resultId = (result: MatchResult) => (result.kind === 'person' ? result.card.id : result.listing.id)

/**
 * The update rule of PD6c: a new form key waits while the person scrolls or reads, and applies when they are idle.
 * Results for the key on the screen change nothing, so the order never moves under the person.
 */
export type PanelState<T> = { shown: { key: string; page: T } | null; pending: { key: string; page: T } | null; busy: boolean }
export type PanelEvent<T> = { type: 'arrive'; key: string; page: T } | { type: 'busy' } | { type: 'idle' }

export function panelUpdate<T>(state: PanelState<T>, event: PanelEvent<T>): PanelState<T> {
  switch (event.type) {
    case 'arrive': {
      if ((state.pending ?? state.shown)?.key === event.key) return state
      const next = { key: event.key, page: event.page }
      return state.busy ? { ...state, pending: next } : { ...state, shown: next, pending: null }
    }
    case 'busy': return state.busy ? state : { ...state, busy: true }
    case 'idle': return { shown: state.pending ?? state.shown, pending: null, busy: false }
  }
}
