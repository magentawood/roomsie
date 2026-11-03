import { describe, expect, it } from 'vitest'
import { answered, onboardingSteps, progressOf, startOf, stepBeside, withoutAnswer, type Answers } from './onboarding'

const full: Answers = { purpose: 'look', whosMoving: 'student', intent: 'room', budget: 'under_25k', area: 'andheri-goregaon' }

describe('the steps of flow 01', () => {
  it('asks a seeker the four questions, then the sign-in, and a signed-in seeker only the questions', () => {
    expect(onboardingSteps(full, false)).toEqual(['purpose', 'whosMoving', 'intent', 'budget', 'area', 'signIn'])
    expect(onboardingSteps(full, true)).toEqual(['purpose', 'whosMoving', 'intent', 'budget', 'area'])
  })

  it('takes a skipped purpose as a seeker, and sends a lister to the sign-in only', () => {
    expect(onboardingSteps({}, false)).toEqual(onboardingSteps(full, false))
    expect(onboardingSteps({ purpose: 'list' }, false)).toEqual(['purpose', 'signIn'])
    expect(onboardingSteps({ purpose: 'list' }, true)).toEqual(['purpose'])
  })

  it('fills the bar of the four questions, with no bar on the purpose or for a lister', () => {
    expect((['purpose', 'whosMoving', 'area', 'signIn'] as const).map((step) => progressOf(step, full))).toEqual([null, 1, 4, 4])
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
    expect(stepBeside('area', 1, full, false)).toBe('signIn')
    expect(stepBeside('area', 1, full, true)).toBeUndefined()
    expect(stepBeside('purpose', 1, { purpose: 'list' }, true)).toBeUndefined()
  })

  it('opens Next with an answer, and for "Looking for my son or daughter" only with what they do', () => {
    expect(answered('budget', {})).toBe(false)
    expect(answered('budget', full)).toBe(true)
    expect(answered('whosMoving', { whosMoving: 'parent' })).toBe(false)
    expect(answered('whosMoving', { whosMoving: 'parent', childType: 'first_job' })).toBe(true)
  })

  it('clears the answer of a skipped step, and keeps the others', () => {
    expect(withoutAnswer('budget', full)).toEqual({ ...full, budget: undefined })
    expect(withoutAnswer('whosMoving', { whosMoving: 'parent', childType: 'working', area: 'thane' })).toEqual({ area: 'thane', whosMoving: undefined, childType: undefined })
  })
})

describe('the start answers of the goal', () => {
  it('sends the four answers with the values of the chips, and not the purpose', () => {
    expect(startOf(full)).toEqual({ whosMoving: 'student', intent: 'room', budget: 'under_25k', area: 'andheri-goregaon' })
  })

  it('sends what a son or daughter does as who is moving (PD15)', () => {
    expect(JSON.stringify(startOf({ whosMoving: 'parent', childType: 'first_job' }))).toBe('{"whosMoving":"first_job"}')
  })

  it('sends no value for a skipped step, so the chat asks it', () => {
    expect(JSON.stringify(startOf({ purpose: 'look' }))).toBe('{}')
  })
})
