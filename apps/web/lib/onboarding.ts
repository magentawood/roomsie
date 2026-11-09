import type { BudgetBand, childTypes, GoalStart, intents, MustHaveKey } from '@roomsie/contract'
import type { DescribesYou } from './profile-form'

/** The steps of flow 01 (Product file). */
export type Step = 'purpose' | 'whosMoving' | 'livesWith' | 'intent' | 'budget' | 'areas' | 'mustHaves' | 'signIn'
/** The picks of the steps. A skipped step has no answer. */
export type Answers = {
  purpose?: 'look' | 'flatmate' | 'list'
  whosMoving?: DescribesYou
  /** What a son or daughter does, after "Looking for my son or daughter" (PD15). */
  childType?: (typeof childTypes)[number]
  intent?: (typeof intents)[number]
  budget?: BudgetBand
  /** Area groups: one or more. */
  areas?: string[]
  /** "Who would you like to live with?" of a flatmate seeker. */
  livesWith?: 'women' | 'men' | 'any'
  mustHaves?: MustHaveKey[]
}

const placeQuestions = ['whosMoving', 'intent', 'budget', 'areas'] as const
/** "I'm looking for a flatmate" is the flatmate search: no "What kind of place?", the gender of the flatmates, and their must-haves at the end. */
const flatmateQuestions = ['whosMoving', 'livesWith', 'budget', 'areas', 'mustHaves'] as const
const questionsOf = (answers: Answers): readonly Step[] => (answers.purpose === 'flatmate' ? flatmateQuestions : placeQuestions)

/** The two paths ask different questions, so a different purpose clears the answers. */
export const withPurpose = (purpose: Answers['purpose'], answers: Answers): Answers => (purpose === answers.purpose ? answers : { purpose })

/** A lister signs in, then lists. A skipped purpose is a seeker. A signed-in person has no sign-in step. */
export function onboardingSteps(answers: Answers, signedIn: boolean): Step[] {
  const signIn: Step[] = signedIn ? [] : ['signIn']
  return answers.purpose === 'list' ? ['purpose', ...signIn] : ['purpose', ...questionsOf(answers), ...signIn]
}

/** The step after this one (1) or before it (-1). None after the last step: the onboarding ends. */
export function stepBeside(step: Step, by: 1 | -1, answers: Answers, signedIn: boolean): Step | undefined {
  const steps = onboardingSteps(answers, signedIn)
  return steps[steps.indexOf(step) + by]
}

/** The bar of the designs has a part for each question of the path. The purpose and the path of a lister have no bar, and the sign-in fills it. */
export function progressOf(step: Step, answers: Answers) {
  if (step === 'purpose' || answers.purpose === 'list') return null
  const asked = questionsOf(answers)
  return { step: step === 'signIn' ? asked.length : asked.indexOf(step) + 1, total: asked.length }
}

/** A flatmate of one gender is a must-have of the search; "Both are fine" adds none. */
const genderMustHave = { women: ['women_only'], men: ['men_only'], any: [] } satisfies Record<NonNullable<Answers['livesWith']>, MustHaveKey[]>

/** Next needs an answer, and "Looking for my son or daughter" also needs what they do. */
export const answered = (step: Step, answers: Answers) =>
  step !== 'signIn' && answers[step] !== undefined && (step !== 'whosMoving' || answers.whosMoving !== 'parent' || answers.childType !== undefined)

export const withoutAnswer = (step: Step, answers: Answers): Answers =>
  ({ ...answers, [step]: undefined, ...(step === 'whosMoving' && { childType: undefined }) })

/** The answers of `POST /v1/goals`. JSON leaves out a skipped answer, and with none the chat asks the first question. */
export const startOf = ({ purpose, whosMoving, childType, intent, budget, areas = [], livesWith, mustHaves = [] }: Answers): GoalStart => ({
  whosMoving: whosMoving === 'parent' ? childType : whosMoving, intent, budget,
  // One group goes as `area`, which an older API also takes during a deploy.
  ...(areas.length === 1 ? { area: areas[0] } : areas.length > 1 && { areas }),
  ...(purpose === 'flatmate' && { intent: 'flatmates', mustHaves: [...(livesWith ? genderMustHave[livesWith] : []), ...mustHaves] }),
})
