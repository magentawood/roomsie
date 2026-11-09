import {
  formA, lifestyleAxes, mustHaveKeys, type Budget, type CardResponse, type FormA, type LifestyleAxis, type ListingResponse, type MustHaveKey, type ProfileResponse,
} from '@roomsie/contract'
import { labels, rupees } from './listing-steps'

/** What the box of a detail compares with (PD3a): the form of the goal in the chat, or the profile of the viewer on a page. */
export type Side = {
  areas: readonly string[]
  budget: Budget | null
  lifestyle: Partial<Record<LifestyleAxis, string>>
  /** The must-haves, dealbreakers and preferences. */
  mustHaves: MustHaveKey[]
  age: number | null
  commute: string | null
}

/** The parts of the area tree that the facts use. */
export type AreaNames = { lineage: (slug: string) => string[]; name: (slug: string) => string }

/** The form has no age and no commute, so they come from the profile of the viewer, when there is one. */
export function sideOfForm(form: FormA, own: Pick<ProfileResponse, 'age' | 'commuteAddress'> | null | undefined): Side {
  return {
    areas: form.areas.value ?? [],
    budget: form.budget.value,
    lifestyle: Object.fromEntries(lifestyleAxes.flatMap((axis) => {
      const answer = form.lifestyle[axis].value
      return answer && answer !== 'unclear' ? [[axis, answer]] : []
    })),
    mustHaves: mustHaveKeys.filter((key) => ['prefer', 'dealbreaker'].includes(form.mustHaves[key].value ?? '')),
    age: own?.age ?? null,
    commute: own?.commuteAddress ?? null,
  }
}

export function sideOfProfile(profile: ProfileResponse): Side {
  const { budgetMin: min, budgetMax: max } = profile
  return {
    areas: profile.areas,
    budget: min === null && max === null ? null : { min, max },
    lifestyle: profile.lifestyle,
    mustHaves: mustHaveKeys.filter((key) => profile.mustHaves[key]),
    age: profile.age,
    commute: profile.commuteAddress,
  }
}

const stated = <V>(value: V) => ({ source: 'stated' as const, value })

/** The profile as a stated form, for the label of a detail on a page. Null: the profile has no form that parses. */
export function formOfProfile(profile: ProfileResponse): FormA | null {
  const { budgetMin: min, budgetMax: max } = profile
  return formA.safeParse({
    ...(profile.intent !== 'unclear' && { intent: stated(profile.intent) }),
    ...(profile.whosMoving !== 'unclear' && { whosMoving: stated(profile.whosMoving) }),
    ...(profile.areas.length > 0 && { areas: stated(profile.areas) }),
    ...((min !== null || max !== null) && { budget: stated({ min, max }) }),
    ...(profile.moveDate && { moveDate: stated(profile.moveDate) }),
    lifestyle: Object.fromEntries(Object.entries(profile.lifestyle).map(([axis, answer]) => [axis, stated(answer)])),
    mustHaves: Object.fromEntries(Object.entries(profile.mustHaves).map(([key, weight]) => [key, stated(weight)])),
  }).data ?? null
}

/** The label of the box: the "Best match" rule of PD3a. */
export const matchTitle = (bestMatch: boolean) => (bestMatch ? 'A great match' : 'An average match')

/** A list in words: "a", "a and b", "a, b and c". */
const inWords = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0] ?? '')

/** The same answer on both sides, for the three axes of the box. */
const sameAnswer: Record<'food' | 'smoking' | 'drinks', Record<string, string>> = {
  food: { veg: 'you both eat veg', non_veg: 'you both eat non-veg', eggetarian: 'you are both eggetarian', jain: 'you both eat Jain food' },
  smoking: { non_smoker: 'neither of you smokes', smoker: 'you both smoke', smoke_outside: 'you both smoke only outside' },
  drinks: { none_at_home: 'neither of you drinks at home', fine_at_home: 'you are both fine with drinks at home' },
}

/** Two budgets overlap as the match query has it (PD3a): an open end has no limit. */
const budgetsOverlap = (a: Budget, b: Budget) => (a.max === null || (b.min ?? 0) <= a.max) && (a.min === null || b.max === null || b.max >= a.min)

/** The areas of the two sides that overlap: one pick is the other, or holds it. The deeper pick names the overlap. */
function sharedAreas(areas: AreaNames, mine: readonly string[], theirs: readonly string[]) {
  return [...new Set(mine.flatMap((a) => theirs.flatMap((b) => (areas.lineage(a).includes(b) ? [a] : areas.lineage(b).includes(a) ? [b] : []))))]
}

const plain = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '')
/** Two commutes overlap when one names the other, as "Goregaon" and "Goregaon East". */
function sameCommute(a: string, b: string) {
  const [x, y] = [plain(a), plain(b)]
  return x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x))
}

/** What the viewer and a person share: food, smoking, drinks, ages within 3 years, budgets, areas and commute. */
export function personFacts(side: Side, card: CardResponse, areas: AreaNames): string[] {
  const facts = (['food', 'smoking', 'drinks'] as const).flatMap((axis) => {
    const answer = card.lifestyle[axis]
    return answer && side.lifestyle[axis] === answer ? [sameAnswer[axis][answer]!] : []
  })
  const gap = side.age !== null && card.age !== null ? Math.abs(side.age - card.age) : null
  if (gap !== null && gap <= 3) facts.push(gap === 0 ? 'you are the same age' : `you are ${gap} ${gap === 1 ? 'year' : 'years'} apart in age`)
  const theirBudget = card.budgetMin === null && card.budgetMax === null ? null : { min: card.budgetMin, max: card.budgetMax }
  if (side.budget && theirBudget && budgetsOverlap(side.budget, theirBudget)) facts.push('your budgets overlap')
  const shared = sharedAreas(areas, side.areas, card.areas).map(areas.name)
  if (shared.length) facts.push(`you both look in ${shared.length > 2 ? `${shared[0]} and ${shared.length - 1} more areas` : inWords(shared)}`)
  if (side.commute && card.commuteAddress && sameCommute(side.commute, card.commuteAddress)) facts.push(`you both commute to ${card.commuteAddress}`)
  return facts
}

/** The must-haves that a listing answers (PD3a). "Near a station" is the walk, which has a fact of its own. */
const onListing: Partial<Record<MustHaveKey, { meets: (listing: ListingResponse) => boolean; words: string }>> = {
  veg_kitchen: { meets: (l) => l.vegOnlyKitchen === true, words: 'veg kitchen' },
  non_smokers: { meets: (l) => l.smokingAllowed === false, words: 'no-smoking rule' },
  no_alcohol: { meets: (l) => l.alcoholAllowed === false, words: 'no-alcohol rule' },
  couple_friendly: { meets: (l) => l.whoIsWelcome.includes('couples'), words: 'welcome for couples' },
}

/** What a place gives of what the viewer asked: a rent inside the budget, an area asked, the must-haves met, and a walk of 10 minutes or less to a station. */
export function placeFacts(side: Side, listing: ListingResponse, areas: AreaNames): string[] {
  const facts: string[] = []
  const { budget } = side
  const rents = budget ? listing.rates.map((r) => r.rent).filter((rent) => (budget.max === null || rent <= budget.max) && (budget.min === null || rent >= budget.min)) : []
  if (rents.length) facts.push(`the rent of ${rupees(Math.min(...rents))} is inside your budget`)
  const area = listing.areaSlug
  if (area && side.areas.some((pick) => areas.lineage(area).includes(pick))) facts.push(`it is in ${areas.name(area)} as you asked`)
  const met = side.mustHaves.flatMap((key) => (onListing[key]?.meets(listing) ? [onListing[key].words] : []))
  if (met.length) facts.push(`it has the ${inWords(met)} you need`)
  if (listing.walkStation === '5_min' || listing.walkStation === '10_min') facts.push(`${listing.nearestStation ?? 'the station'} is a ${labels.walkTime[listing.walkStation]}`)
  return facts
}

/** The facts as one sentence. Null: the two sides share nothing, so the box does not show. */
export function factSentence(facts: string[]) {
  if (!facts.length) return null
  const text = inWords(facts)
  return `${text[0]!.toUpperCase()}${text.slice(1)}.`
}
