import { describe, expect, it } from 'vitest'
import type { CardResponse } from '@roomsie/contract'
import { aboutLine, budgetLine, connectLine, initials, lifestyleLines, lifestyleSummary, lookingFor, moveLine, mustHaveGroups } from './person'

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
    expect(aboutLine(card)).toBe('Business analyst • 26 yrs')
    expect(aboutLine({ jobRole: null, age: null })).toBe('')
    expect(initials('Divya Sharma Rao')).toBe('DS')
  })

  it('names the lifestyle answers in the order of the designs, with "Their days"', () => {
    expect(lifestyleLines(card).map((l) => [l.label, l.value])).toEqual([
      ['Food', 'Veg'], ['Smoking', 'Non-smoker'], ['Their days', 'Home most days'], ['Sleep', 'Night owl'], ['Pets', 'No pets'],
    ])
    expect(lifestyleSummary(card)).toBe('Veg • Non-smoker • Home most days +2')
    expect(lifestyleSummary({ ...card, lifestyle: {} })).toBeNull()
  })

  it('splits the must-haves into dealbreakers and preferences', () => {
    expect(mustHaveGroups(card)).toEqual({ dealbreakers: ['Veg kitchen', 'No alcohol at home'], prefers: ['Non-smokers'] })
  })
})

describe('the line under the connect button', () => {
  it('follows the connection, and tells a viewer at the daily cap why Say hi is disabled', () => {
    const cap = 'You can send 10 new requests a day. Try again tomorrow.'
    expect(connectLine({ state: 'none' }, 3, 'Divya')).toBeNull()
    expect(connectLine({ state: 'none' }, 0, 'Divya')).toBe(cap)
    expect(connectLine({ state: 'not_available' }, 3, 'Divya')).toBe('Divya isn’t available right now. You can send Divya a new request later.')
    expect(connectLine({ state: 'not_available' }, 0, 'Divya')).toBe(cap)
    expect(connectLine({ state: 'sent' }, 0, 'Divya')).toBe('Waiting for Divya to accept. Requests close after 14 days.')
    expect(connectLine({ state: 'received', requestId: card.id, note: 'Hi' }, 3, 'Divya')).toBe('Divya sent you a request')
    expect(connectLine({ state: 'accepted' }, 3, 'Divya')).toBe('You’re connected. The chat opens here when Messages is ready.')
  })
})
