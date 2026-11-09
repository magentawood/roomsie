import {
  budgetBands as bands, type BudgetBand, childTypes, lifestyleAnswerLabels, maxAge, minAge, type Community, type LifestyleAxis, type MustHaveKey, type MustHaveWeight, type ProfileEditBody, type ProfileResponse, type Religion, type WhosMoving,
} from '@roomsie/contract'

export const ages = Array.from({ length: maxAge - minAge + 1 }, (_, i) => i + minAge)

/** A budget that the chat set can fit no band. */
export const bandOf = (min: number | null, max: number | null): BudgetBand | null =>
  bands.find((b) => b.min === min && b.max === max)?.id ?? null

/** "What best describes you?": the answers of who is moving, and "parent" for "Looking for my son or daughter". */
export type DescribesYou = Exclude<WhosMoving, 'unclear'> | 'parent'
type MovingFields = { managedByParent: boolean; whosMoving: WhosMoving }

export const describesYou = (p: MovingFields): DescribesYou | null =>
  p.managedByParent ? 'parent' : p.whosMoving === 'unclear' ? null : p.whosMoving

/** A parent keeps a type of a son or daughter; each other answer is who is moving (PD15). */
export function pickDescribesYou(choice: DescribesYou, current: MovingFields): MovingFields {
  if (choice !== 'parent') return { managedByParent: false, whosMoving: choice }
  const isChildType = (childTypes as readonly WhosMoving[]).includes(current.whosMoving)
  return { managedByParent: true, whosMoving: isChildType ? current.whosMoving : 'unclear' }
}

export type ProfileForm = Required<Omit<ProfileEditBody, 'photoKeys' | 'intent'>>

export const formOf = (p: ProfileResponse): ProfileForm => ({
  fullName: p.fullName, age: p.age ?? minAge, gender: p.gender, jobRole: p.jobRole, commuteAddress: p.commuteAddress, bio: p.bio,
  managedByParent: p.managedByParent, whosMoving: p.whosMoving, areas: p.areas, budgetMin: p.budgetMin, budgetMax: p.budgetMax,
  moveDate: p.moveDate, hidden: p.visibility === 'hidden', lifestyle: p.lifestyle, mustHaves: p.mustHaves, religion: p.religion, community: p.community,
})

/** The answers that changed: a new value, or null for a cleared one. */
function changedAnswers<K extends string, V>(saved: Partial<Record<K, V>>, draft: Partial<Record<K, V>>) {
  const keys = new Set([...Object.keys(saved), ...Object.keys(draft)] as K[])
  // An answer that was never set and one that was cleared are the same.
  return Object.fromEntries([...keys].filter((k) => (saved[k] ?? null) !== (draft[k] ?? null)).map((k) => [k, draft[k] ?? null])) as Partial<Record<K, V | null>>
}

export function editBody(saved: ProfileForm, draft: ProfileForm): ProfileEditBody {
  const body: Record<string, unknown> = {}
  for (const key of Object.keys(draft) as (keyof ProfileForm)[]) {
    if (key === 'lifestyle' || key === 'mustHaves') continue
    if (JSON.stringify(saved[key]) !== JSON.stringify(draft[key])) body[key] = draft[key]
  }
  const lifestyle = changedAnswers<LifestyleAxis, string | null>(saved.lifestyle, draft.lifestyle)
  const mustHaves = changedAnswers<MustHaveKey, MustHaveWeight | null>(saved.mustHaves, draft.mustHaves)
  if (Object.keys(lifestyle).length) body.lifestyle = lifestyle
  if (Object.keys(mustHaves).length) body.mustHaves = mustHaves
  return body as ProfileEditBody
}

export const profileLabels = {
  gender: { male: 'Male', female: 'Female', non_binary: 'Non-Binary' },
  religion: {
    hindu: 'Hindu', muslim: 'Muslim', christian: 'Christian', sikh: 'Sikh', jain: 'Jain', buddhist: 'Buddhist', parsi: 'Parsi', jewish: 'Jewish',
    none: 'No religion', other: 'Other',
  } satisfies Record<Religion, string>,
  community: {
    gujarati: 'Gujarati', marathi: 'Marathi', marwari: 'Marwari', kutchi: 'Kutchi', sindhi: 'Sindhi', punjabi: 'Punjabi', bengali: 'Bengali', bihari: 'Bihari',
    uttar_pradesh: 'Uttar Pradesh', odia: 'Odia', tamil: 'Tamil', telugu: 'Telugu', kannadiga: 'Kannadiga', malayali: 'Malayali', konkani: 'Konkani',
    north_east: 'North East', other: 'Other',
  } satisfies Record<Community, string>,
  describesYou: {
    student: 'Student', first_job: 'Starting my first job', working: 'Working and looking for a better place', couple: 'Couple',
    family: 'Family', friends: 'Group of friends', parent: 'Looking for my son or daughter',
  } satisfies Record<DescribesYou, string>,
  childType: { student: 'Student', first_job: 'Starting their first job', working: 'Working' },
  axes: {
    food: 'Food', smoking: 'Smoking', drinks: 'Drinks', guests: 'Guests', your_days: 'Your days', sleep: 'Sleep', tidiness: 'Tidiness', pets: 'Pets',
  } satisfies Record<LifestyleAxis, string>,
  answers: lifestyleAnswerLabels,
  mustHaves: {
    veg_kitchen: 'Veg kitchen', non_smokers: 'Non-smokers', no_alcohol: 'No alcohol at home', women_only: 'Women only',
    men_only: 'Men only', tidy_flatmates: 'Tidy flatmates', couple_friendly: 'Couple friendly', near_station: 'Near a station',
  } satisfies Record<MustHaveKey, string>,
  weights: { prefer: 'Prefer', dealbreaker: 'Dealbreaker' },
  missing: { whosMoving: 'What best describes you', areas: 'The areas you look in', budget: 'Your budget' },
  missingChildType: 'What your son or daughter does',
  budget: Object.fromEntries(bands.map((band) => [band.id, band.label])) as Record<BudgetBand, string>,
}

export const firstName = (fullName: string) => fullName.split(/\s+/)[0] ?? fullName
