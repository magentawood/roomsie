import { describe, expect, it } from 'vitest'
import { lifestyleAnswers, lifestyleAxes, type ProfileResponse } from '@roomsie/contract'
import { answered, onboardingSteps, profileCompletion, progressOf, skipped, startOf, type Answers } from './onboarding'

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

describe('Next and Skip', () => {
  it('opens Next with an answer, and for "Looking for my son or daughter" only with what they do', () => {
    expect(answered('budget', {})).toBe(false)
    expect(answered('budget', full)).toBe(true)
    expect(answered('whosMoving', { whosMoving: 'parent' })).toBe(false)
    expect(answered('whosMoving', { whosMoving: 'parent', childType: 'first_job' })).toBe(true)
  })

  it('clears the answer of a skipped step, and keeps the others', () => {
    expect(skipped('budget', full)).toEqual({ ...full, budget: undefined })
    expect(skipped('whosMoving', { whosMoving: 'parent', childType: 'working', area: 'thane' })).toEqual({ area: 'thane', whosMoving: undefined, childType: undefined })
  })
})

describe('the start answers of the goal', () => {
  it('sends the four answers with the values of the chips, and not the purpose', () => {
    expect(startOf(full)).toEqual({ whosMoving: 'student', intent: 'room', budget: 'under_25k', area: 'andheri-goregaon' })
  })

  it('sends what a son or daughter does as who is moving (PD15)', () => {
    expect(startOf({ whosMoving: 'parent', childType: 'first_job' })).toEqual({ whosMoving: 'first_job' })
  })

  it('gives null with no answer, so the chat opens empty', () => {
    expect(startOf({ purpose: 'look' })).toBeNull()
  })
})

describe('the completion of a profile', () => {
  const profile: ProfileResponse = {
    id: '0199e4b0-0000-7000-8000-000000000001', fullName: 'Divya Sharma', age: 24, gender: 'female', religion: null, community: null, jobRole: null, commuteAddress: null, bio: null,
    managedByParent: false, intent: 'unclear', whosMoving: 'unclear', areas: [], budgetMin: null, budgetMax: null, moveDate: null,
    photos: [], lifestyle: {}, mustHaves: {}, visibility: 'draft', missing: ['whosMoving', 'areas', 'budget'], hiddenForReview: false, verified: false,
  }
  const allLifestyle = Object.fromEntries(lifestyleAxes.map((axis) => [axis, lifestyleAnswers[axis][0]])) as ProfileResponse['lifestyle']

  it('gives 0 with no profile, and 3 of 11 parts for a new profile', () => {
    expect(profileCompletion(null)).toBe(0)
    expect(profileCompletion(profile)).toBe(27)
  })

  it('gives 100 when each of the 11 parts has a value', () => {
    expect(profileCompletion({
      ...profile, photos: [{ key: 'profiles/a.webp', url: 'https://example.com/a.webp' }], whosMoving: 'working', areas: ['thane'], budgetMax: 25_000,
      moveDate: '2026-12-01', jobRole: 'Designer', bio: 'Hi', lifestyle: allLifestyle,
    })).toBe(100)
  })

  it('counts the lifestyle answers only when all eight have a value, and a parent only with what the son or daughter does', () => {
    expect(profileCompletion({ ...profile, lifestyle: { ...allLifestyle, pets: undefined } })).toBe(27)
    expect(profileCompletion({ ...profile, managedByParent: true, whosMoving: 'unclear' })).toBe(27)
    expect(profileCompletion({ ...profile, budgetMin: 35_000 })).toBe(36)
  })
})
