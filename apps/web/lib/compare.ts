import { compareKinds, lifestyleAxes, listingTitle, maxCompared, type CompareKind, type CompareRequest, type Comparison, type LifestyleAxis, type MatchResult } from '@roomsie/contract'
import { labels, rupees } from './listing-steps'
import { budgetLine } from './person'
import { ifSet, shortDate } from './place-detail'
import { firstName, profileLabels } from './profile-form'

/** A selected card, with the name of its chip above the input (T-49). */
export type Picked = { kind: CompareKind; id: string; name: string }
export type Picks = { picked: Picked[]; onPick: (card: Picked) => void; onClear: () => void }

export const pickOf = (result: MatchResult): Picked =>
  result.kind === 'person' ? { kind: 'person', id: result.card.id, name: result.card.fullName } : { kind: 'place', id: result.listing.id, name: listingTitle(result.listing) }

/** The "Select" tick: a second tap clears the card. A card of the other kind starts a new selection. A fifth card does not go in (`isFull`). */
export function toggledPick(picked: Picked[], card: Picked): Picked[] {
  if (picked.some((p) => p.id === card.id)) return picked.filter((p) => p.id !== card.id)
  if (picked[0] && picked[0].kind !== card.kind) return [card]
  return picked.length < maxCompared ? [...picked, card] : picked
}

/** "Ask in chat" adds its card as a chip and never removes it. The other rules are those of the tick. */
export const askedPick = (picked: Picked[], card: Picked): Picked[] => (picked.some((p) => p.id === card.id) ? picked : toggledPick(picked, card))

/** True when the card cannot go in: four cards of its kind are in, the most that a comparison takes. The chat then says why. */
export const isFull = (picked: Picked[], card: Picked) =>
  picked.length >= maxCompared && picked[0]!.kind === card.kind && !picked.some((p) => p.id === card.id)

/**
 * The words of a question about one card: the name of the card, which the chat shows as a chip in the bubble (`aboutOf`),
 * then the message. The API takes the name out before a model reads the message, and reads the card from `compare`.
 * Two cards or more keep the text as the person typed it.
 */
export function questionOf(text: string, picked: Picked[]) {
  if (picked.length !== 1) return text
  const card = picked[0]!
  return `About “${card.kind === 'person' ? firstName(card.name) : card.name}”: ${text}`
}

/** The words in the empty chat input while cards are picked ("Ask about the listings...", 63:4472). Undefined: the words of a new search. */
export function askPlaceholder(picked: Picked[]) {
  if (!picked.length) return undefined
  if (picked[0]!.kind === 'place') return picked.length === 1 ? 'Ask about this listing…' : 'Ask about the listings…'
  return picked.length === 1 ? 'Ask about this person…' : 'Ask about these people…'
}

/** The card and the message of a question about one card, or null for each other message. */
export function aboutOf(text: string): { name: string; text: string } | null {
  const match = /^About “([^”]+)”: ([\s\S]+)$/.exec(text)
  return match ? { name: match[1]!, text: match[2]! } : null
}

/** "Ask in chat" on the page of a card leaves the card in the session storage of the tab. Null: nothing, or a value that is not a card. */
export function storedPick(value: string | null): Picked | null {
  try {
    const card = JSON.parse(value ?? 'null') as Partial<Picked> | null
    return card && compareKinds.includes(card.kind!) && typeof card.id === 'string' && typeof card.name === 'string' ? { kind: card.kind!, id: card.id, name: card.name } : null
  } catch {
    return null
  }
}

/**
 * The selected cards of a question, in the order of the results, which the match query gives, so Option 1 is the best match.
 * One card goes too: the API answers from its facts (PD10). Null: no card.
 */
export function compareOf(picked: Picked[], resultIds: string[]): CompareRequest | null {
  if (!picked.length) return null
  const rank = (id: string) => (resultIds.includes(id) ? resultIds.indexOf(id) : resultIds.length)
  return { kind: picked[0]!.kind, ids: picked.map((p) => p.id).toSorted((a, b) => rank(a) - rank(b)) }
}

type Option<K extends CompareKind> = Extract<Comparison, { kind: K }>['options'][number]
type Field<K extends CompareKind> = { label: string; text: (option: Option<K>) => string | null }

const yesNo = (value: boolean) => (value ? 'Yes' : 'No')
const lifestyleField = (axis: LifestyleAxis): Field<'person'> => ({
  label: axis === 'your_days' ? 'Their days' : profileLabels.axes[axis],
  text: ({ lifestyle }) => { const value = lifestyle[axis]; return value ? (profileLabels.answers[axis] as Record<string, string>)[value]! : null },
})

/** Each field of a table, in the order of its rows. */
const fields = {
  place: {
    rent: { label: 'Rent', text: (o) => `${rupees(o.rent)}/mo` },
    moveInCash: { label: 'Move-in cash', text: (o) => rupees(o.moveInCash) },
    deposit: { label: 'Deposit', text: (o) => ifSet(o.deposit, rupees) },
    station: { label: 'Station', text: (o) => [o.nearestStation, o.walkStation && labels.walkTime[o.walkStation]].filter(Boolean).join(', ') || null },
    maintenance: { label: 'Maintenance', text: (o) => ifSet(o.maintenance, rupees) },
    brokerage: { label: 'Brokerage', text: (o) => ifSet(o.brokerage, rupees) },
    availableFrom: { label: 'Available from', text: (o) => o.availableFrom && shortDate(o.availableFrom) },
    minStay: { label: 'Minimum stay', text: (o) => o.minStay && labels.minStay[o.minStay] },
    furnishing: { label: 'Furnishing', text: (o) => o.furnishing && labels.furnishing[o.furnishing] },
    verified: { label: 'Verified lister', text: (o) => yesNo(o.verified) },
  } satisfies Record<string, Field<'place'>>,
  person: {
    age: { label: 'Age', text: (o) => (o.age === null ? null : `${o.age} yrs`) },
    jobRole: { label: 'Job', text: (o) => o.jobRole },
    budget: { label: 'Budget', text: budgetLine },
    moveDate: { label: 'Move date', text: (o) => o.moveDate && shortDate(o.moveDate) },
    whosMoving: { label: 'Who’s moving', text: (o) => (o.whosMoving === 'unclear' ? null : profileLabels.describesYou[o.whosMoving]) },
    ...Object.fromEntries(lifestyleAxes.map((axis) => [axis, lifestyleField(axis)])) as Record<LifestyleAxis, Field<'person'>>,
    verified: { label: 'Verified', text: (o) => yesNo(o.verified) },
  } satisfies Record<string, Field<'person'>>,
}

/** The rows that a table shows first: the four of the design for places, and seven for people (the spec of T-49). */
export const firstFields: Record<CompareKind, string[]> = {
  place: ['rent', 'moveInCash', 'deposit', 'station'],
  person: ['age', 'jobRole', 'budget', 'moveDate', 'food', 'smoking', 'verified'],
} satisfies { [K in CompareKind]: (keyof (typeof fields)[K])[] }

export const fieldsOf = (kind: CompareKind) => Object.entries(fields[kind]).map(([field, { label }]) => ({ field, label }))

export function tableOf(table: Comparison, shown: string[]) {
  const all = Object.entries(fields[table.kind]) as [string, Field<CompareKind>][]
  return all.filter(([field]) => shown.includes(field))
    .map(([field, { label, text }]) => ({ field, label, cells: table.options.map((option) => (text as (o: typeof option) => string | null)(option) ?? '—') }))
}

/** The old API refuses `compare` as a body that is not valid during a deploy (api.md). */
export function compareRefusal(error: string) {
  if (error === 'not valid: body') return 'Comparing cards starts in a few minutes. Try again soon.'
  if (error === 'not valid: compare') return 'One of these cards is no longer open. Clear the selection and pick again.'
  return null
}
