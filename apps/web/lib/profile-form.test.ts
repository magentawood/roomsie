import { describe, expect, it } from 'vitest'
import type { ProfileResponse } from '@roomsie/contract'
import { bandOf, cardBannerState, describesYou, editBody, firstName, formOf, pickDescribesYou, withMustHave } from './profile-form'

const saved: ProfileResponse = {
  id: '0199e4b0-0000-7000-8000-000000000001', fullName: 'Divya Sharma', age: 24, gender: 'female', religion: null, community: null, jobRole: null, commuteAddress: null, bio: null,
  managedByParent: false, intent: 'unclear', whosMoving: 'working', areas: ['bandra-santacruz'], budgetMin: null, budgetMax: 25000, moveDate: null,
  photos: [], lifestyle: { food: 'veg' }, mustHaves: { veg_kitchen: 'dealbreaker' }, visibility: 'live', missing: [], hiddenForReview: false, verified: false, completion: 45,
}

describe('the budget bands of the designs', () => {
  it('gives the band of a budget, and no band for a budget that the chat set', () => {
    expect(bandOf(null, 10000)).toBe('under_10k')
    expect(bandOf(35000, null)).toBe('above_35k')
    expect(bandOf(12000, 18000)).toBeNull()
    expect(bandOf(null, null)).toBeNull()
  })
})

describe('"What best describes you?"', () => {
  it('turns "Looking for my son or daughter" into the parent flag, and keeps a type of a son or daughter', () => {
    expect(describesYou({ managedByParent: true, whosMoving: 'student' })).toBe('parent')
    expect(describesYou({ managedByParent: false, whosMoving: 'couple' })).toBe('couple')
    expect(pickDescribesYou('parent', { managedByParent: false, whosMoving: 'working' })).toEqual({ managedByParent: true, whosMoving: 'working' })
    expect(pickDescribesYou('parent', { managedByParent: false, whosMoving: 'couple' })).toEqual({ managedByParent: true, whosMoving: 'unclear' })
    expect(pickDescribesYou('family', { managedByParent: true, whosMoving: 'student' })).toEqual({ managedByParent: false, whosMoving: 'family' })
  })
})

describe('the body of an edit', () => {
  it('sends only the fields that changed', () => {
    const form = formOf(saved)
    expect(editBody(form, form)).toEqual({})
    expect(editBody(form, { ...form, fullName: 'Divya S', areas: ['bandra-santacruz', 'thane'], hidden: true }))
      .toEqual({ fullName: 'Divya S', areas: ['bandra-santacruz', 'thane'], hidden: true })
  })

  it('sends nothing for an answer that was set and cleared again before a Save', () => {
    const form = formOf({ ...saved, lifestyle: {}, mustHaves: {} })
    expect(editBody(form, { ...form, lifestyle: { food: null }, mustHaves: { men_only: null } })).toEqual({})
  })

  it('sends a changed or cleared lifestyle answer or must-have, with null for a cleared one', () => {
    const form = formOf(saved)
    expect(editBody(form, { ...form, lifestyle: { smoking: 'non_smoker' }, mustHaves: { veg_kitchen: 'prefer', no_alcohol: 'dealbreaker' } })).toEqual({
      lifestyle: { food: null, smoking: 'non_smoker' },
      mustHaves: { veg_kitchen: 'prefer', no_alcohol: 'dealbreaker' },
    })
  })
})

describe('the first name of a card', () => {
  it('is the first word, and the word after the mark of a demo card', () => {
    expect([firstName('Riya Shah'), firstName('Demo · Riya S.'), firstName('Asha')]).toEqual(['Riya', 'Riya', 'Asha'])
  })
})

describe('the must-haves of the profile', () => {
  it('keeps one of "Women only" and "Men only": a weight on one clears the other, and a clear leaves the other', () => {
    expect(withMustHave({ women_only: 'prefer', veg_kitchen: 'dealbreaker' }, 'men_only', 'dealbreaker')).toEqual({ women_only: null, men_only: 'dealbreaker', veg_kitchen: 'dealbreaker' })
    expect(withMustHave({ women_only: 'prefer' }, 'men_only', null)).toEqual({ women_only: 'prefer', men_only: null })
    expect(withMustHave({}, 'veg_kitchen', 'prefer')).toEqual({ veg_kitchen: 'prefer' })
  })
})

describe('the state that the banner of the card tells', () => {
  it('changes with the visibility, the review and the list of missing fields, so a closed banner shows again after a change', () => {
    expect(cardBannerState(saved)).toBe('live')
    expect(cardBannerState({ ...saved, visibility: 'hidden' })).toBe('hidden')
    expect(cardBannerState({ ...saved, hiddenForReview: true })).toBe('review')
    expect(cardBannerState({ ...saved, visibility: 'draft', missing: ['whosMoving', 'areas'] })).toBe('draft:whosMoving,areas')
    expect(cardBannerState({ ...saved, visibility: 'draft', missing: ['areas'] })).toBe('draft:areas')
  })
})
