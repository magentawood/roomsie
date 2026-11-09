import { describe, expect, it } from 'vitest'
import { answered, onboardingSteps, progressOf, startOf, stepBeside, withoutAnswer, withPurpose, type Answers } from './onboarding'

const full: Answers = { purpose: 'look', whosMoving: 'student', intent: 'room', budget: 'under_25k', areas: ['andheri-goregaon'] }

describe('the steps of flow 01', () => {
  it('asks a seeker the four questions, then the sign-in, and a signed-in seeker only the questions', () => {
    expect(onboardingSteps(full, false)).toEqual(['purpose', 'whosMoving', 'intent', 'budget', 'areas', 'signIn'])
    expect(onboardingSteps(full, true)).toEqual(['purpose', 'whosMoving', 'intent', 'budget', 'areas'])
  })

  it('asks a flatmate seeker no place type but the gender of the flatmates and the must-haves, fills its bar of five, and starts the flatmate search', () => {
    const flatmate: Answers = { purpose: 'flatmate', whosMoving: 'working', budget: 'under_25k', mustHaves: ['veg_kitchen'] }
    expect(onboardingSteps(flatmate, false)).toEqual(['purpose', 'whosMoving', 'livesWith', 'budget', 'areas', 'mustHaves', 'signIn'])
    expect((['whosMoving', 'mustHaves', 'signIn'] as const).map((step) => progressOf(step, flatmate)?.step)).toEqual([1, 5, 5])
    expect(progressOf('budget', flatmate)?.total).toBe(5)
    expect(startOf(flatmate)).toEqual({ whosMoving: 'working', intent: 'flatmates', budget: 'under_25k', mustHaves: ['veg_kitchen'] })
  })

  it('makes "Female flatmates" and "Male flatmates" a must-have of the search, and "Both are fine" none', () => {
    const flatmate: Answers = { purpose: 'flatmate', mustHaves: ['veg_kitchen'] }
    expect(startOf({ ...flatmate, livesWith: 'women' }).mustHaves).toEqual(['women_only', 'veg_kitchen'])
    expect(startOf({ ...flatmate, livesWith: 'men' }).mustHaves).toEqual(['men_only', 'veg_kitchen'])
    expect(startOf({ purpose: 'flatmate', livesWith: 'any' }).mustHaves).toEqual([])
  })

  it('takes a skipped purpose as a seeker, and sends a lister to the sign-in only', () => {
    expect(onboardingSteps({}, false)).toEqual(onboardingSteps(full, false))
    expect(onboardingSteps({ purpose: 'list' }, false)).toEqual(['purpose', 'signIn'])
    expect(onboardingSteps({ purpose: 'list' }, true)).toEqual(['purpose'])
  })

  it('fills the bar of the four questions, with no bar on the purpose or for a lister', () => {
    expect((['purpose', 'whosMoving', 'areas', 'signIn'] as const).map((step) => progressOf(step, full))).toEqual([null, { step: 1, total: 4 }, { step: 4, total: 4 }, { step: 4, total: 4 }])
    expect(progressOf('signIn', { purpose: 'list' })).toBeNull()
  })
})

describe('Previous, Next and Skip', () => {
  it('goes to the step before and after, on the path of the answers', () => {
    expect(stepBeside('whosMoving', -1, full, false)).toBe('purpose')
    expect(stepBeside('purpose', -1, full, false)).toBeUndefined()
    expect(stepBeside('purpose', 1, { purpose: 'list' }, false)).toBe('signIn')
    expect(stepBeside('signIn', -1, { purpose: 'list' }, false)).toBe('purpose')
  })

  it('ends after the area for a signed-in person, and after the purpose for a signed-in lister', () => {
    expect(stepBeside('areas', 1, full, false)).toBe('signIn')
    expect(stepBeside('areas', 1, full, true)).toBeUndefined()
    expect(stepBeside('purpose', 1, { purpose: 'list' }, true)).toBeUndefined()
  })

  it('opens Next with an answer, and for "Looking for my son or daughter" only with what they do', () => {
    expect(answered('budget', {})).toBe(false)
    expect(answered('budget', full)).toBe(true)
    expect(answered('whosMoving', { whosMoving: 'parent' })).toBe(false)
    expect(answered('whosMoving', { whosMoving: 'parent', childType: 'first_job' })).toBe(true)
  })

  it('clears the answers when the purpose changes, and keeps them for the same purpose', () => {
    expect(withPurpose('flatmate', full)).toEqual({ purpose: 'flatmate' })
    expect(withPurpose('look', full)).toBe(full)
  })

  it('clears the answer of a skipped step, and keeps the others', () => {
    expect(withoutAnswer('budget', full)).toEqual({ ...full, budget: undefined })
    expect(withoutAnswer('whosMoving', { whosMoving: 'parent', childType: 'working', areas: ['thane'] })).toEqual({ areas: ['thane'], whosMoving: undefined, childType: undefined })
  })
})

describe('the start answers of the goal', () => {
  it('sends the four answers with the values of the chips, and not the purpose', () => {
    expect(startOf(full)).toEqual({ whosMoving: 'student', intent: 'room', budget: 'under_25k', area: 'andheri-goregaon' })
  })

  it('sends what a son or daughter does as who is moving (PD15)', () => {
    expect(JSON.stringify(startOf({ whosMoving: 'parent', childType: 'first_job' }))).toBe('{"whosMoving":"first_job"}')
  })

  it('sends the must-haves only on the flatmate path', () => {
    expect(startOf({ purpose: 'look', mustHaves: ['veg_kitchen'] })).toEqual({ intent: undefined, whosMoving: undefined, budget: undefined })
  })

  it('sends one area group as `area`, which an older API takes, and two or more as `areas`', () => {
    expect(startOf({ areas: ['thane'] })).toMatchObject({ area: 'thane' })
    expect(startOf({ areas: ['thane', 'navi-mumbai'] })).toMatchObject({ areas: ['thane', 'navi-mumbai'] })
    expect('area' in startOf({ areas: ['thane', 'navi-mumbai'] })).toBe(false)
  })

  it('sends no value for a skipped step, so the chat asks it', () => {
    expect(JSON.stringify(startOf({ purpose: 'look' }))).toBe('{}')
  })
})
