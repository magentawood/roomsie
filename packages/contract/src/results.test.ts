import { describe, expect, it } from 'vitest'
import { matchResult } from './results'

const card = {
  id: '0190f5c2-7d3a-7b1e-9c4a-2f6d8e1a3b5c', fullName: 'Riya', age: 26, jobRole: null, commuteAddress: null, bio: null,
  managedByParent: false, intent: 'flatmates', whosMoving: 'working', areas: ['powai'], budgetMin: 15_000, budgetMax: 22_000,
  moveDate: null, photos: [], lifestyle: { food: 'veg' }, mustHaves: {}, verified: false,
}
const labels = { bestMatch: false, didntSay: ['non_smokers'] }

describe('a result', () => {
  it('reads a person with its card and labels', () => {
    const result = matchResult.parse({ kind: 'person', card, ...labels })
    expect(result.kind === 'person' && result.card.fullName).toBe('Riya')
  })

  it.each([
    ['a person with no card', { kind: 'person', ...labels }],
    ['a listing with a card in place of a listing', { kind: 'listing', card, ...labels }],
    ['a kind that is not person or listing', { kind: 'broker', card, ...labels }],
    ['a person with no labels', { kind: 'person', card }],
    ['a Didn\'t say item that is not a must-have', { kind: 'person', card, bestMatch: false, didntSay: ['smoking'] }],
  ])('rejects %s', (_, input) => {
    expect(matchResult.safeParse(input).success).toBe(false)
  })
})
