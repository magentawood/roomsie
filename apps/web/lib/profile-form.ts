import {
  budgetBands as bands, type BudgetBand, childTypes, lifestyleAnswerLabels, lifestyleAxes, mustHaveKeys, type FormA, type GoalsResponse, maxAge, maxProfilePhotos, minAge, type Community, type LifestyleAxis, type MustHaveKey, type MustHaveWeight, type ProfileEditBody, type ProfileResponse, type Religion, type WhosMoving,
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

const otherGender: Partial<Record<MustHaveKey, MustHaveKey>> = { women_only: 'men_only', men_only: 'women_only' }
/** "Women only" and "Men only" rule each other out: a weight on one clears the other. */
export const withMustHave = (mustHaves: ProfileForm['mustHaves'], key: MustHaveKey, weight: MustHaveWeight | null): ProfileForm['mustHaves'] => {
  const other = weight && otherGender[key]
  return { ...mustHaves, [key]: weight, ...(other && { [other]: null }) }
}

/** The first word of a name. The demo cards of the launch are "Demo · Riya S.", so their first name is the word after the mark. */
export const firstName = (fullName: string) => fullName.replace(/^Demo · /, '').split(/\s+/)[0] ?? fullName

/** The title and the helper of each section of the profile page. The Help modal repeats them, so the two texts stay the same. */
export const profileSections = {
  basics: { title: 'The Basics', helper: 'Role only, never the company.' },
  photos: { title: 'Photos', helper: `Two or more gets you far more replies. Up to ${maxProfilePhotos}.` },
  search: { title: 'Your search', helper: 'Shown on your card so people can rule themselves in or out.' },
  lifestyle: { title: 'What you are', helper: 'Facts about how you live. Other people’s must-haves check these.' },
  mustHaves: { title: 'What you need from other seekers', helper: 'Choose Prefer or Dealbreaker. I hide anything that breaks a dealbreaker.' },
  thoughts: { title: 'Your thoughts', helper: 'Some info about you that you want others to see. This shows on your card.' },
  settings: { title: 'Settings', helper: 'Verification, card visibility, alerts and your account.' },
} as const

/**
 * The state that the banner of the card tells. A close of the banner keeps this value in the browser, and the banner shows
 * again when the value changes: a new state, or a different list of missing fields.
 */
export const cardBannerState = (p: Pick<ProfileResponse, 'hiddenForReview' | 'visibility' | 'missing'>) =>
  p.hiddenForReview ? 'review' : p.visibility === 'draft' ? `draft:${p.missing.join(',')}` : p.visibility

/** "Fill using our chat" reads the open chat that the person used last. */
export function newestOpenGoal(goals: GoalsResponse['goals']) {
  const lastUsed = (goal: GoalsResponse['goals'][number]) => goal.updatedAt ?? goal.createdAt
  return goals.filter((goal) => goal.status === 'open').sort((a, b) => lastUsed(b).localeCompare(lastUsed(a)))[0] ?? null
}

const said = <V>(slot: { source: string; value: V }) => (slot.source === 'stated' ? slot.value : null)

/**
 * "Fill using our chat" (ADR-0017): the answers that the person said in a chat, as a change of the profile. A default of the
 * chat never counts, and an answer that the profile has already makes no change. A parent's card takes only the types of
 * a son or daughter (PD15).
 */
export function chatFill(form: FormA, profile: ProfileResponse): ProfileEditBody {
  const body: ProfileEditBody = {}
  const intents = said(form.intent)
  const intent = Array.isArray(intents) ? (intents.includes('flatmates') ? 'flatmates' : intents[0]!) : null
  if (intent && intent !== profile.intent) body.intent = intent
  const moving = said(form.whosMoving)
  const fitsCard = !profile.managedByParent || (childTypes as readonly WhosMoving[]).includes(moving ?? 'unclear')
  if (moving && moving !== 'unclear' && moving !== profile.whosMoving && fitsCard) body.whosMoving = moving
  const areas = said(form.areas)
  if (areas && areas.join() !== profile.areas.join()) body.areas = areas
  const budget = said(form.budget)
  if (budget && (budget.min !== profile.budgetMin || budget.max !== profile.budgetMax)) Object.assign(body, { budgetMin: budget.min, budgetMax: budget.max })
  const moveDate = said(form.moveDate)
  if (moveDate && moveDate !== profile.moveDate) body.moveDate = moveDate
  const lifestyle = lifestyleAxes.flatMap((axis) => {
    const answer = said(form.lifestyle[axis])
    return answer && answer !== 'unclear' && answer !== profile.lifestyle[axis] ? [[axis, answer]] : []
  })
  if (lifestyle.length) body.lifestyle = Object.fromEntries(lifestyle)
  const weights = Object.fromEntries(mustHaveKeys.flatMap((key) => {
    const weight = said(form.mustHaves[key])
    return weight && weight !== 'unclear' ? [[key, weight]] : []
  })) as Partial<Record<MustHaveKey, MustHaveWeight>>
  // "Women only" and "Men only" rule each other out: a chat that said both gives neither, and one clears the other on the card.
  if (weights.women_only && weights.men_only) {
    delete weights.women_only
    delete weights.men_only
  }
  const mustHaves: Partial<Record<MustHaveKey, MustHaveWeight | null>> = {}
  for (const [key, weight] of Object.entries(weights) as [MustHaveKey, MustHaveWeight][]) {
    if (weight === profile.mustHaves[key]) continue
    mustHaves[key] = weight
    const other = otherGender[key]
    if (other && profile.mustHaves[other]) mustHaves[other] = null
  }
  if (Object.keys(mustHaves).length) body.mustHaves = mustHaves
  return body
}
