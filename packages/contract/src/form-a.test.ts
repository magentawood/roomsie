import { describe, expect, it } from 'vitest'
import { formA } from './form-a'
import { lifestyleAnswers, mustHaveKeys, profileEditBody } from './profiles'

const empty = { value: null, source: 'empty' }

describe('Form A', () => {
  it('reads an empty object as a form with all slots empty', () => {
    const form = formA.parse({})
    expect(form.intent).toEqual(empty)
    expect(form.budget).toEqual(empty)
    expect(form.lifestyle.food).toEqual(empty)
    expect(form.mustHaves.couple_friendly).toEqual(empty)
    expect(form.version).toBe(1)
  })

  it.each<[string, unknown]>([
    ['intent', { intent: { value: 'unclear', source: 'stated' } }],
    ['room type', { roomType: { value: 'unclear', source: 'stated' } }],
    ["who's moving", { whosMoving: { value: 'unclear', source: 'stated' } }],
    ...Object.keys(lifestyleAnswers).map((axis): [string, unknown] => [axis, { lifestyle: { [axis]: { value: 'unclear', source: 'stated' } } }]),
    ...mustHaveKeys.map((key): [string, unknown] => [`the weight of ${key}`, { mustHaves: { [key]: { value: 'unclear', source: 'stated' } } }]),
  ])('accepts unclear for %s', (_, input) => {
    expect(formA.safeParse(input).success).toBe(true)
  })

  it('keeps unclear out of the profile form', () => {
    expect(profileEditBody.safeParse({ lifestyle: { food: 'unclear' } }).success).toBe(false)
  })

  it('accepts the stated and default sources', () => {
    const form = formA.parse({
      budget: { value: { min: null, max: 20_000 }, source: 'default' },
      mustHaves: { non_smokers: { value: 'dealbreaker', source: 'stated' } },
    })
    expect(form.budget).toEqual({ value: { min: null, max: 20_000 }, source: 'default' })
    expect(form.mustHaves.non_smokers.value).toBe('dealbreaker')
  })

  it.each([
    ['the inferred source', { lifestyle: { sleep: { value: 'night_owl', source: 'inferred' } } }],
    ['an empty slot with a value', { intent: { value: 'pg', source: 'empty' } }],
    ['a stated slot with no value', { intent: { value: null, source: 'stated' } }],
    ['an answer of a different question', { lifestyle: { food: { value: 'night_owl', source: 'stated' } } }],
    ['a budget minimum above its maximum', { budget: { value: { min: 30_000, max: 20_000 }, source: 'stated' } }],
    ['a budget with no amount', { budget: { value: { min: null, max: null }, source: 'stated' } }],
    ['a stated slot of no areas', { areas: { value: [], source: 'stated' } }],
    ['a slot name that Form A does not have', { whosmoving: { value: 'student', source: 'stated' } }],
    ['the words of the person in a slot', { lifestyle: { smoking: { value: 'non_smoker', source: 'stated', evidence: 'no smoke' } } }],
    ['a form of a different version', { version: 2 }],
  ])('rejects %s', (_, input) => {
    expect(formA.safeParse(input).success).toBe(false)
  })
})
