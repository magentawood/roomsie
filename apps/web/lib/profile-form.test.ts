import { describe, expect, it } from 'vitest'
import type { ProfileResponse } from '@roomsie/contract'
import { bandOf, budgetBands, describesYou, editBody, formOf, pickDescribesYou } from './profile-form'

const saved: ProfileResponse = {
  id: '0199e4b0-0000-7000-8000-000000000001', fullName: 'Divya Sharma', age: 24, gender: 'female', jobRole: null, commuteAddress: null, bio: null,
  managedByParent: false, intent: 'unclear', whosMoving: 'working', areas: ['bandra-santacruz'], budgetMin: null, budgetMax: 25000, moveDate: null,
  photos: [], lifestyle: { food: 'veg' }, mustHaves: { veg_kitchen: 'dealbreaker' }, visibility: 'live', missing: [],
}

describe('the budget bands of the designs', () => {
  it('gives the band of a budget, and no band for a budget that the chat set', () => {
    expect(bandOf(null, 10000)).toBe('under_10k')
    expect(bandOf(35000, null)).toBe('above_35k')
    expect(bandOf(12000, 18000)).toBeNull()
    expect(bandOf(null, null)).toBeNull()
    expect(budgetBands.find((b) => b.id === 'above_35k')).toMatchObject({ min: 35000, max: null })
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

  it('sends a changed or cleared lifestyle answer or must-have, with null for a cleared one', () => {
    const form = formOf(saved)
    expect(editBody(form, { ...form, lifestyle: { smoking: 'non_smoker' }, mustHaves: { veg_kitchen: 'prefer', no_alcohol: 'dealbreaker' } })).toEqual({
      lifestyle: { food: null, smoking: 'non_smoker' },
      mustHaves: { veg_kitchen: 'prefer', no_alcohol: 'dealbreaker' },
    })
  })

  it('reads "Hide my card" from the state of the card', () => {
    expect(formOf({ ...saved, visibility: 'hidden' }).hidden).toBe(true)
    expect(formOf({ ...saved, visibility: 'draft' }).hidden).toBe(false)
  })
})
