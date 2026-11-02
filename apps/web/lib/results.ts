import { resultsPageSize, type FormA, type MatchResult, type MustHaveKey, type ResultsResponse } from '@roomsie/contract'
import { rupees } from './listing-steps'

/** What a search found, in the pages that loaded. `total` counts the results of all pages. */
export type Found = { results: MatchResult[]; total: number; suggested: MatchResult[] }

/** The pages of a search as one grid. Only a search that finds nothing has suggested posts, on its first page (T-14). */
export const foundIn = ({ pages }: { pages: ResultsResponse[] }): Found => ({
  results: pages.flatMap((page) => page.results),
  total: pages.at(-1)!.total,
  suggested: pages[0]!.suggestions.flatMap((suggestion) => suggestion.results),
})

export const nextPage = ({ page, total }: Pick<ResultsResponse, 'page' | 'total'>) => (page * resultsPageSize < total ? page + 1 : undefined)

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

function budgetPhrase({ min, max }: NonNullable<FormA['budget']['value']>) {
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

export const countLine = (n: number) => `${n} ${n === 1 ? 'result' : 'results'}`

/**
 * The panel is a pure function of the form (PD6c): the values and the weights, never the sources.
 * Thus a stated value that confirms a default gives the same key, and no new query.
 */
export function formKey(form: FormA) {
  return JSON.stringify([
    form.intent.value, form.roomType.value, form.whosMoving.value, form.areas.value, form.budget.value, form.moveDate.value,
    Object.entries(form.lifestyle).map(([axis, slot]) => [axis, slot.value]),
    Object.entries(form.mustHaves).map(([key, slot]) => [key, slot.value]),
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
export function didntSayLine(result: Pick<MatchResult, 'kind' | 'didntSay'>) {
  if (!result.didntSay.length) return null
  return `Didn’t say: ${[...new Set(result.didntSay.map((key) => unanswered[result.kind][key]))].join(', ')}`
}

/**
 * The update rule of PD6c: a new form key waits while the person scrolls or reads, and applies when they are idle.
 * Results for the key on the screen show at once: a search never runs again for one key, so they only add the next page at the end.
 */
export type PanelState<T> = { shown: { key: string; value: T } | null; pending: { key: string; value: T } | null; busy: boolean }
type PanelEvent<T> = { type: 'arrive'; key: string; value: T } | { type: 'busy' } | { type: 'idle' }

export function panelUpdate<T>(state: PanelState<T>, event: PanelEvent<T>): PanelState<T> {
  switch (event.type) {
    case 'arrive': {
      const next = { key: event.key, value: event.value }
      return state.busy && state.shown && state.shown.key !== event.key ? { ...state, pending: next } : { ...state, shown: next, pending: null }
    }
    case 'busy': return state.busy ? state : { ...state, busy: true }
    case 'idle': return { shown: state.pending ?? state.shown, pending: null, busy: false }
  }
}
