import { describe, expect, it } from 'vitest'
import { matchResult, resultsBody, resultsResponse } from './results'

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
    ['a Didn\'t say item that is not a must-have', { kind: 'person', card, bestMatch: false, didntSay: ['smoking'] }],
  ])('rejects %s', (_, input) => {
    expect(matchResult.safeParse(input).success).toBe(false)
  })
})

describe('a search', () => {
  it('reads an empty form on page 1', () => {
    const body = resultsBody.parse({ form: {} })
    expect(body.page).toBe(1)
    expect(body.form.intent).toEqual({ source: 'empty', value: null })
  })

  it.each([
    ['page 0', { form: {}, page: 0 }],
    ['a key that it does not have', { form: {}, sort: 'newest' }],
  ])('rejects %s', (_, input) => {
    expect(resultsBody.safeParse(input).success).toBe(false)
  })

  it('reads the suggested posts of an empty search, with the reason of each', () => {
    const response = resultsResponse.parse({
      results: [], total: 0, page: 1,
      suggestions: [
        { relaxed: { kind: 'budget', max: 25_000 }, results: [{ kind: 'person', card, ...labels }] },
        { relaxed: { kind: 'area', area: 'andheri-goregaon' }, results: [] },
      ],
    })
    expect(response.suggestions.map((s) => s.relaxed.kind)).toEqual(['budget', 'area'])
  })
})
