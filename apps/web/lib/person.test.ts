import { describe, expect, it } from 'vitest'
import type { CardResponse } from '@roomsie/contract'
import { budgetLine, connectView, lifestyleLines, lifestyleSummary, lookingFor, moveLine, mustHaveGroups } from './person'

const card: CardResponse = {
  id: '0199e4b0-0000-7000-8000-000000000001', fullName: 'Divya Sharma', age: 26, jobRole: 'Business analyst', commuteAddress: 'Goregaon', bio: null,
  managedByParent: false, intent: 'flatmates', whosMoving: 'working', areas: ['andheri-goregaon'], budgetMin: null, budgetMax: 15000,
  moveDate: '2026-11-01', photos: [], lifestyle: { food: 'veg', smoking: 'non_smoker', your_days: 'home_most_days', sleep: 'night_owl', pets: 'no_pets' },
  mustHaves: { no_alcohol: 'dealbreaker', non_smokers: 'prefer', veg_kitchen: 'dealbreaker' },
}

describe('the lines of a card', () => {
  it('gives what the person looks for, the budget and the moving date', () => {
    expect(lookingFor(card)).toBe('Flat with flatmates')
    expect(lookingFor({ ...card, intent: 'unclear' })).toBeNull()
    expect(budgetLine(null, 15000)).toBe('Up to ₹15,000')
    expect(budgetLine(35000, null)).toBe('From ₹35,000')
    expect(budgetLine(12000, 18000)).toBe('₹12,000 to ₹18,000')
    expect(budgetLine(null, null)).toBeNull()
    expect(moveLine('2026-11-01')).toBe('1 Nov 26')
  })

  it('names the lifestyle answers in the order of the designs, with "Their days"', () => {
    expect(lifestyleLines(card)).toEqual([
      { label: 'Food', value: 'Veg' }, { label: 'Smoking', value: 'Non-smoker' },
      { label: 'Their days', value: 'Home most days' }, { label: 'Sleep', value: 'Night owl' }, { label: 'Pets', value: 'No pets' },
    ])
    expect(lifestyleSummary(card)).toBe('Veg • Non-smoker • Home most days +2')
    expect(lifestyleSummary({ ...card, lifestyle: {} })).toBeNull()
  })

  it('splits the must-haves into dealbreakers and preferences', () => {
    expect(mustHaveGroups(card)).toEqual({ dealbreakers: ['Veg kitchen', 'No alcohol at home'], prefers: ['Non-smokers'] })
  })
})

describe('the connect button', () => {
  it('follows the connection and the daily cap', () => {
    expect(connectView({ state: 'none' }, 3, 'Divya')).toEqual({ kind: 'say_hi', disabled: false, line: null })
    expect(connectView({ state: 'none' }, 0, 'Divya')).toEqual({ kind: 'say_hi', disabled: true, line: 'You can send 10 new requests a day. Try again tomorrow.' })
    expect(connectView({ state: 'sent' }, 3, 'Divya')).toEqual({ kind: 'sent', disabled: true, line: 'Waiting for Divya to accept. Requests close after 14 days.' })
    expect(connectView({ state: 'accepted' }, 3, 'Divya')).toEqual({ kind: 'chat', disabled: true, line: 'You’re connected. The chat opens here when Messages is ready.' })
    expect(connectView({ state: 'not_available' }, 3, 'Divya')).toEqual({ kind: 'say_hi_again', disabled: false, line: 'Divya isn’t available right now. You can send Divya a new request later.' })
    expect(connectView({ state: 'not_available' }, 0, 'Divya')).toMatchObject({ kind: 'say_hi_again', disabled: true })
    expect(connectView({ state: 'received', requestId: card.id, note: 'Hi' }, 3, 'Divya')).toEqual({ kind: 'received', disabled: false, line: 'Divya sent you a request' })
  })
})
