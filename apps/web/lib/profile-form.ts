import {
  childTypes, type LifestyleAxis, type ProfileEditBody, type ProfileResponse, type mustHaveKeys, type whosMovingAnswers,
} from '@roomsie/contract'
import { labels } from './listing-steps'

type WhosMoving = (typeof whosMovingAnswers)[number]
type MustHave = (typeof mustHaveKeys)[number]

/** The budget bands of the designs. "Above ₹35k" sets the lowest amount, each other band the highest. */
export const budgetBands = [
  { id: 'under_10k', label: 'Under ₹10k', min: null, max: 10000 },
  { id: 'under_15k', label: 'Under ₹15k', min: null, max: 15000 },
  { id: 'under_25k', label: 'Under ₹25k', min: null, max: 25000 },
  { id: 'under_35k', label: 'Under ₹35k', min: null, max: 35000 },
  { id: 'above_35k', label: 'Above ₹35k', min: 35000, max: null },
] as const
export type BudgetBand = (typeof budgetBands)[number]['id']

/** The band of a budget. A budget that the chat set can fit no band. */
export const bandOf = (min: number | null, max: number | null): BudgetBand | null =>
  budgetBands.find((b) => b.min === min && b.max === max)?.id ?? null

/** "What best describes you?": the answers of who is moving, and "parent" for "Looking for my son or daughter". */
export type DescribesYou = Exclude<WhosMoving, 'unclear'> | 'parent'
type Moving = { managedByParent: boolean; whosMoving: WhosMoving }

export const describesYou = (p: Moving): DescribesYou | null =>
  p.managedByParent ? 'parent' : p.whosMoving === 'unclear' ? null : p.whosMoving

/** A parent keeps a type of a son or daughter; each other answer is who is moving (PD15). */
export function pickDescribesYou(choice: DescribesYou, current: Moving): Moving {
  if (choice !== 'parent') return { managedByParent: false, whosMoving: choice }
  const isChildType = (childTypes as readonly WhosMoving[]).includes(current.whosMoving)
  return { managedByParent: true, whosMoving: isChildType ? current.whosMoving : 'unclear' }
}

/** The fields of the page. "hidden" is the "Hide my card" switch. */
export type ProfileForm = Required<Omit<ProfileEditBody, 'photoKeys' | 'intent'>>

export const formOf = (p: ProfileResponse): ProfileForm => ({
  fullName: p.fullName, age: p.age ?? 18, gender: p.gender, jobRole: p.jobRole, commuteAddress: p.commuteAddress, bio: p.bio,
  managedByParent: p.managedByParent, whosMoving: p.whosMoving, areas: p.areas, budgetMin: p.budgetMin, budgetMax: p.budgetMax,
  moveDate: p.moveDate, hidden: p.visibility === 'hidden', lifestyle: p.lifestyle, mustHaves: p.mustHaves,
})

/** The answers that changed: a new value, or null for a cleared one. */
function changedAnswers<K extends string, V>(saved: Partial<Record<K, V>>, draft: Partial<Record<K, V>>) {
  const keys = new Set([...Object.keys(saved), ...Object.keys(draft)] as K[])
  return Object.fromEntries([...keys].filter((k) => saved[k] !== draft[k]).map((k) => [k, draft[k] ?? null])) as Partial<Record<K, V | null>>
}

/** The PATCH body: only the fields that changed. */
export function editBody(saved: ProfileForm, draft: ProfileForm): ProfileEditBody {
  const body: Record<string, unknown> = {}
  for (const key of Object.keys(draft) as (keyof ProfileForm)[]) {
    if (key === 'lifestyle' || key === 'mustHaves') continue
    if (JSON.stringify(saved[key]) !== JSON.stringify(draft[key])) body[key] = draft[key]
  }
  const lifestyle = changedAnswers<LifestyleAxis, string | null>(saved.lifestyle, draft.lifestyle)
  const mustHaves = changedAnswers<MustHave, string | null>(saved.mustHaves, draft.mustHaves)
  if (Object.keys(lifestyle).length) body.lifestyle = lifestyle
  if (Object.keys(mustHaves).length) body.mustHaves = mustHaves
  return body as ProfileEditBody
}

/** The labels of the profile page, as the designs write them. */
export const profileLabels = {
  gender: { male: 'Male', female: 'Female', non_binary: 'Non-Binary' },
  describesYou: {
    student: 'Student', first_job: 'Starting my first job', working: 'Working and looking for a better place', couple: 'Couple',
    family: 'Family', friends: 'Group of friends', parent: 'Looking for my son or daughter',
  } satisfies Record<DescribesYou, string>,
  childType: { student: 'Student', first_job: 'Starting their first job', working: 'Working' },
  axes: {
    food: 'Food', smoking: 'Smoking', drinks: 'Drinks', guests: 'Guests', your_days: 'Your days', sleep: 'Sleep', tidiness: 'Tidiness', pets: 'Pets',
  } satisfies Record<LifestyleAxis, string>,
  answers: {
    food: labels.food,
    smoking: { non_smoker: 'Non-smoker', smoker: 'Smoker', smoke_outside: 'Smoke outside' },
    drinks: { none_at_home: 'None at home', fine_at_home: 'Fine at home' },
    guests: { weekends_only: 'Weekends only', guests_welcome: 'Guests welcome', guests_rarely: 'Guests rarely' },
    your_days: { out_most_days: 'Out most days', home_most_days: 'Home most days', night_shifts: 'Night shifts', student: 'Student' },
    sleep: { night_owl: 'Night owl', early_bird: 'Early bird' },
    tidiness: { very_tidy: 'Very tidy', tidy_enough: 'Tidy enough', relaxed_about_mess: 'Relaxed about mess' },
    pets: { no_pets: 'No pets', fine_with_pets: 'Fine with pets' },
  },
  mustHaves: {
    veg_kitchen: 'Veg kitchen', non_smokers: 'Non-smokers', no_alcohol: 'No alcohol at home', women_only: 'Women only',
    men_only: 'Men only', tidy_flatmates: 'Tidy flatmates', couple_friendly: 'Couple friendly',
  } satisfies Record<MustHave, string>,
  weights: { prefer: 'Prefer', dealbreaker: 'Dealbreaker' },
  missing: { whosMoving: 'What best describes you', areas: 'The areas you look in', budget: 'Your budget' },
  budget: Object.fromEntries(budgetBands.map((b) => [b.id, b.label])) as Record<BudgetBand, string>,
}
