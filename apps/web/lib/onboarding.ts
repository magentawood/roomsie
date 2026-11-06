import type { BudgetBand, childTypes, GoalStart, intents, MustHaveKey } from '@roomsie/contract'
import type { DescribesYou } from './profile-form'

/** The steps of flow 01 (Product file). */
export type Step = 'purpose' | 'whosMoving' | 'intent' | 'budget' | 'area' | 'mustHaves' | 'signIn'
/** The picks of the steps. A skipped step has no answer. */
export type Answers = {
  purpose?: 'look' | 'flatmate' | 'list'
  whosMoving?: DescribesYou
  /** What a son or daughter does, after "Looking for my son or daughter" (PD15). */
  childType?: (typeof childTypes)[number]
  intent?: (typeof intents)[number]
  budget?: BudgetBand
  area?: GoalStart['area']
  mustHaves?: MustHaveKey[]
}

const placeQuestions = ['whosMoving', 'intent', 'budget', 'area'] as const
/** "I'm looking for a flatmate" is the flatmate search: no "What kind of place?", and the must-haves of a flatmate at the end. */
const flatmateQuestions = ['whosMoving', 'budget', 'area', 'mustHaves'] as const
const questionsOf = (answers: Answers): readonly Step[] => (answers.purpose === 'flatmate' ? flatmateQuestions : placeQuestions)

/** The two paths ask different questions, so a different purpose clears the answers. */
export const withPurpose = (purpose: Answers['purpose'], answers: Answers): Answers => (purpose === answers.purpose ? answers : { purpose })

/** "Women only" and "Men only" rule out each other, so the new pick of the two stays. */
const genders: readonly MustHaveKey[] = ['women_only', 'men_only']
export function pickMustHaves(keys: MustHaveKey[], before: readonly MustHaveKey[] = []): MustHaveKey[] | undefined {
  const added = keys.find((key) => !before.includes(key))
  const picked = added && genders.includes(added) ? keys.filter((key) => key === added || !genders.includes(key)) : keys
  return picked.length ? picked : undefined
}

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

/** The bar of the designs has a part for each question. The purpose and the path of a lister have no bar, and the sign-in fills it. */
export function progressOf(step: Step, answers: Answers) {
  if (step === 'purpose' || answers.purpose === 'list') return null
  const asked = questionsOf(answers)
  return step === 'signIn' ? asked.length : asked.indexOf(step) + 1
}

/** Next needs an answer, and "Looking for my son or daughter" also needs what they do. */
export const answered = (step: Step, answers: Answers) =>
  step !== 'signIn' && answers[step] !== undefined && (step !== 'whosMoving' || answers.whosMoving !== 'parent' || answers.childType !== undefined)

export const withoutAnswer = (step: Step, answers: Answers): Answers =>
  ({ ...answers, [step]: undefined, ...(step === 'whosMoving' && { childType: undefined }) })

/** The answers of `POST /v1/goals`. JSON leaves out a skipped answer, and with none the chat asks the first question. */
export const startOf = ({ purpose, whosMoving, childType, intent, budget, area, mustHaves }: Answers): GoalStart => ({
  whosMoving: whosMoving === 'parent' ? childType : whosMoving, intent, budget, area,
  ...(purpose === 'flatmate' && { intent: 'flatmates', mustHaves }),
})
