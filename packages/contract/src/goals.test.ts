import { describe, expect, it } from 'vitest'
import { formA } from './form-a'
import { goalResponse, goalTitle } from './goals'

const olderTurn = { id: '01a19c99-5fa0-7d83-ab48-16626c750a4f', role: 'assistant', text: 'What is your monthly budget?', createdAt: '2026-11-02T14:00:00.000Z' }

describe('a reply of the API before a deploy', () => {
  it('reads a goal and a turn with no chips and no count of free messages', () => {
    expect(goalResponse.parse({ id: olderTurn.id, form: formA.parse({}), turns: [olderTurn] })).toMatchObject({ typedTurnsLeft: null, status: 'open', turns: [{ chips: null }] })
  })
})

describe('the title of a goal (T-50)', () => {
  const names: Record<string, string> = { 'bandra-santacruz': 'Bandra–Santacruz', powai: 'Powai' }
  const title = (form: object) => goalTitle(formA.parse(form), (slug) => names[slug]!)
  const areas = (...value: string[]) => ({ value, source: 'stated' })

  it('names the place type and the first area, as the designs do', () => {
    expect(title({ intent: { value: 'room', source: 'stated' }, areas: areas('bandra-santacruz', 'powai') })).toBe('Room hunting in Bandra–Santacruz')
    expect(title({ intent: { value: 'flatmates', source: 'stated' }, areas: areas('powai') })).toBe('Teaming up to rent around Powai')
    expect(title({ intent: { value: 'whole_flat', source: 'stated' }, areas: areas('powai') })).toBe('Flat hunting in Powai')
    expect(title({ intent: { value: 'pg', source: 'stated' }, areas: areas('powai') })).toBe('PG hunting in Powai')
  })

  it('says "Looking in" with no place type, and "New goal" with no area', () => {
    expect(title({ intent: { value: 'unclear', source: 'stated' }, areas: areas('powai') })).toBe('Looking in Powai')
    expect(title({ areas: areas('powai') })).toBe('Looking in Powai')
    expect(title({ intent: { value: 'room', source: 'stated' } })).toBe('New goal')
  })
})
