import type { BudgetBand, childTypes, GoalStart, intents } from '@roomsie/contract'
import type { DescribesYou } from './profile-form'

/** The steps of flow 01 (Product file). */
export type Step = 'purpose' | 'whosMoving' | 'intent' | 'budget' | 'area' | 'signIn'
/** The picks of the steps. A skipped step has no answer. */
export type Answers = {
  purpose?: 'look' | 'list'
  whosMoving?: DescribesYou
  /** What a son or daughter does, after "Looking for my son or daughter" (PD15). */
  childType?: (typeof childTypes)[number]
  intent?: (typeof intents)[number]
  budget?: BudgetBand
  area?: GoalStart['area']
}

const questions = ['whosMoving', 'intent', 'budget', 'area'] as const

/** A lister signs in, then lists. A skipped purpose is a seeker. A signed-in person has no sign-in step. */
export function onboardingSteps(answers: Answers, signedIn: boolean): Step[] {
  const signIn: Step[] = signedIn ? [] : ['signIn']
  return answers.purpose === 'list' ? ['purpose', ...signIn] : ['purpose', ...questions, ...signIn]
}

/** The step after this one (1) or before it (-1). None after the last step: the onboarding ends. */
export function stepBeside(step: Step, by: 1 | -1, answers: Answers, signedIn: boolean): Step | undefined {
  const steps = onboardingSteps(answers, signedIn)
  return steps[steps.indexOf(step) + by]
}

/** The bar of the designs has a part for each question. The purpose and the path of a lister have no bar, and the sign-in fills it. */
export function progressOf(step: Step, answers: Answers) {
  if (step === 'purpose' || answers.purpose === 'list') return null
  return step === 'signIn' ? questions.length : questions.indexOf(step) + 1
}

/** Next needs an answer, and "Looking for my son or daughter" also needs what they do. */
export const answered = (step: Step, answers: Answers) =>
  step !== 'signIn' && answers[step] !== undefined && (step !== 'whosMoving' || answers.whosMoving !== 'parent' || answers.childType !== undefined)

export const withoutAnswer = (step: Step, answers: Answers): Answers =>
  ({ ...answers, [step]: undefined, ...(step === 'whosMoving' && { childType: undefined }) })

/** The answers of `POST /v1/goals`. JSON leaves out a skipped answer, and with none the chat asks the first question. */
export const startOf = ({ whosMoving, childType, intent, budget, area }: Answers): GoalStart =>
  ({ whosMoving: whosMoving === 'parent' ? childType : whosMoving, intent, budget, area })
