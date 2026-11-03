import { lifestyleAxes, listingTitle, maxCompared, type CompareKind, type CompareRequest, type Comparison, type LifestyleAxis, type MatchResult } from '@roomsie/contract'
import { labels, rupees } from './listing-steps'
import { budgetLine } from './person'
import { ifSet, shortDate } from './place-detail'
import { profileLabels } from './profile-form'

/** A selected card, with the name of its chip above the input (T-49). */
export type Picked = { kind: CompareKind; id: string; name: string }
/** The selection of the results panel. */
export type Picks = { picked: Picked[]; onPick: (card: Picked) => void; onClear: () => void }

export const pickOf = (result: MatchResult): Picked =>
  result.kind === 'person' ? { kind: 'person', id: result.card.id, name: result.card.fullName } : { kind: 'place', id: result.listing.id, name: listingTitle(result.listing) }

export function toggledPick(picked: Picked[], card: Picked): Picked[] {
  if (picked.some((p) => p.id === card.id)) return picked.filter((p) => p.id !== card.id)
  if (picked[0] && picked[0].kind !== card.kind) return [card]
  return picked.length < maxCompared ? [...picked, card] : picked
}

/** The cards in the order of the results, which the match query gives, so Option 1 is the best match. Null: fewer than two cards. */
export function compareOf(picked: Picked[], resultIds: string[]): CompareRequest | null {
  if (picked.length < 2) return null
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

/** A dash for a value that the card does not have. */
export function tableOf(table: Comparison, shown: string[]) {
  const all = Object.entries(fields[table.kind]) as [string, Field<CompareKind>][]
  return all.filter(([field]) => shown.includes(field))
    .map(([field, { label, text }]) => ({ field, label, cells: table.options.map((option) => (text as (o: typeof option) => string | null)(option) ?? '—') }))
}

/**
 * The line of a refused comparison. The old API, in the minutes of a deploy, refuses the field `compare` as a body that is not
 * valid (api.md). The new API refuses a card that the person can no longer see. Null: a different refusal.
 */
export function compareRefusal(error: string) {
  if (error === 'not valid: body') return 'Comparing cards starts in a few minutes. Try again soon.'
  if (error === 'not valid: compare') return 'One of these cards is no longer open. Clear the selection and pick again.'
  return null
}
