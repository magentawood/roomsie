import { intentsOf, resultsPageSize, type FormA, type MatchResult, type MustHaveKey, type Notice, type ResultSort, type ResultsResponse } from '@roomsie/contract'
import { budgetPhrase } from './person'

/** What a search found, in the pages that loaded. `total` counts the results of all pages. `noticed`: the notes of the first page. */
export type Found = { results: MatchResult[]; total: number; suggested: MatchResult[]; noticed: Notice[] }

/** The pages of a search as one grid. Only a search that finds nothing has suggested posts, on its first page (T-14). */
export const joinPages = ({ pages }: { pages: ResultsResponse[] }): Found => ({
  results: pages.flatMap((page) => page.results),
  total: pages.at(-1)!.total,
  suggested: pages[0]!.suggestions.flatMap((suggestion) => suggestion.results),
  noticed: pages[0]!.noticed,
})

export const nextPage = ({ page, total }: Pick<ResultsResponse, 'page' | 'total'>) => (page * resultsPageSize < total ? page + 1 : undefined)

const nouns = { room: 'Rooms', pg: 'PGs', whole_flat: 'Flats', flatmates: 'People' } as const

function areaPhrase(slugs: readonly string[], label: (slug: string) => string) {
  const [first, second, ...rest] = slugs.map(label)
  if (!second) return first!
  return rest.length ? `${first}, ${second} and ${rest.length} more` : `${first} and ${second}`
}

/** The scope of the header: "Everything in Mumbai", then "Flats in Powai–Vikhroli", then "… under ₹20,000" (drafts section 14). */
export function panelTitle(form: FormA, label: (slug: string) => string) {
  const types = intentsOf(form).map((type) => nouns[type])
  const areas = form.areas.value
  const budget = form.budget.value
  const what = types.length > 1 ? `${types.slice(0, -1).join(', ')} and ${types.at(-1)}` : types[0] ?? 'Everything'
  const scope = `${what} in ${areas ? areaPhrase(areas, label) : 'Mumbai'}`
  return budget ? `${scope} ${budgetPhrase(budget)}` : scope
}

/**
 * The photo stack of the results card in the chat (42:12983): the photos of the first three results. Null: a result with no photo.
 * `people`: the results are people to rent with, who go alone (PD15), so the card counts people, not listings.
 */
export type Stack = { photos: (string | null)[]; people: boolean }
export const resultsStack = (form: FormA, results: readonly MatchResult[]): Stack => ({
  photos: results.slice(0, 3).map((r) => (r.kind === 'person' ? r.card.photos[0]?.url : r.listing.photos[0]?.url) ?? null),
  people: intentsOf(form)[0] === 'flatmates',
})
/** "24 listings" or "3 people", as the results card of the designs writes it. */
export const stackCount = (n: number, people: boolean) => `${n} ${people ? (n === 1 ? 'person' : 'people') : n === 1 ? 'listing' : 'listings'}`
/** The heading of the results panel: the count only, as the designs write it ("24 Results"). */
export const resultsHeading = (n: number) => `${n} ${n === 1 ? 'Result' : 'Results'}`

/**
 * The panel is a pure function of the form (PD6c): the values and the weights, never the sources.
 * Thus a stated value that confirms a default gives the same key, and no new query. Each form is a `formA` parse, so its keys have one order.
 * The replacer drops each `source` key at any depth, and only the slots have one.
 */
export const formKey = (form: FormA) => JSON.stringify(form, (key, value: unknown) => (key === 'source' ? undefined : value))

/** The answer that a card did not give, for each dealbreaker: a person answers a lifestyle question, a listing has a house rule (PD3a). */
const unanswered: Record<MatchResult['kind'], Record<MustHaveKey, string>> = {
  person: {
    veg_kitchen: 'food', non_smokers: 'smoking', no_alcohol: 'drinks', tidy_flatmates: 'tidiness',
    women_only: 'gender', men_only: 'gender', couple_friendly: 'couples', near_station: 'station',
  },
  listing: {
    veg_kitchen: 'kitchen', non_smokers: 'smoking', no_alcohol: 'alcohol', tidy_flatmates: 'tidiness',
    women_only: 'who can move in', men_only: 'who can move in', couple_friendly: 'who’s welcome', near_station: 'walk to a station',
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

/** The orders of the sort of the results panel, by the kind of the cards. People have no rent, so they sort by best or newest. */
export const sortLabels: Record<ResultSort, string> = { best: 'Best Matches', rent_low: 'Lowest Rent', rent_high: 'Highest Rent', newest: 'Newest' }
export const sortsFor = (kind: 'listing' | 'person'): ResultSort[] => (kind === 'person' ? ['best', 'newest'] : ['best', 'rent_low', 'rent_high', 'newest'])
