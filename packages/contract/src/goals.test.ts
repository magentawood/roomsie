import { describe, expect, it } from 'vitest'
import { chipAnswers, chipSlots, formA } from './form-a'
import { chipTap, goalResponse, goalTitle, slotOf, tapText, turnResponse } from './goals'

const olderTurn = { id: '01a19c99-5fa0-7d83-ab48-16626c750a4f', role: 'assistant', text: 'What is your monthly budget?', createdAt: '2026-11-02T14:00:00.000Z' }

describe('a reply of the API before a deploy', () => {
  it('reads a turn with no title (T-50)', () => {
    expect(turnResponse.parse({ form: formA.parse({}), turns: [olderTurn, olderTurn], outsidePlaces: [] }).title).toBe('New goal')
  })

  it('reads a goal and a turn with no chips and no count of free messages', () => {
    expect(goalResponse.parse({ id: olderTurn.id, form: formA.parse({}), turns: [olderTurn] })).toMatchObject({ typedTurnsLeft: null, status: 'open', title: 'New goal', turns: [{ chips: null }] })
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

describe('the chips of the closed questions (T-59)', () => {
  const textOf = (tap: object) => tapText(chipTap.parse(tap), (slug) => slug)

  it('writes the label of the chip as the message of the person', () => {
    expect(textOf({ slot: 'lifestyle.food', value: 'veg' })).toBe('Veg')
    expect(textOf({ slot: 'lifestyle.tidiness', value: 'relaxed_about_mess' })).toBe('Relaxed about mess')
    expect(textOf({ slot: 'mustHaves.veg_kitchen', value: 'dealbreaker' })).toBe("It's a must")
    expect(textOf({ slot: 'mustHaves.veg_kitchen', value: 'prefer' })).toBe('Show them first')
    expect(textOf({ slot: 'whosMoving', value: 'friends' })).toBe('Group of friends')
    expect(textOf({ slot: 'roomType', value: 'private' })).toBe('A private room')
  })

  it('gives the answers of each question in their order, the must first for a weight', () => {
    expect(chipAnswers('lifestyle.food').map(({ label }) => label)).toEqual(['Veg', 'Non-veg', 'Eggetarian', 'Jain'])
    expect(chipAnswers('mustHaves.non_smokers')).toEqual([{ value: 'dealbreaker', label: "It's a must" }, { value: 'prefer', label: 'Show them first' }])
    expect(chipAnswers('whosMoving').map(({ label }) => label)).toEqual(['Student', 'First job', 'Working', 'Couple', 'Family', 'Group of friends'])
    expect(chipAnswers('roomType').map(({ label }) => label)).toEqual(['A private room', 'A shared room'])
  })

  it('refuses an answer that its question does not have, and has no chips for the hidden slots (PD15)', () => {
    for (const tap of [
      { slot: 'lifestyle.food', value: 'smoker' }, { slot: 'lifestyle.food', value: 'unclear' }, { slot: 'whosMoving', value: 'unclear' },
      { slot: 'mustHaves.veg_kitchen', value: 'unclear' }, { slot: 'roomType', value: 'unclear' }, { slot: 'religionPreference', value: 'hindu' },
    ]) expect(chipTap.safeParse(tap).success).toBe(false)
    expect(chipSlots).not.toContain('religionPreference')
    expect(chipSlots).not.toContain('communityPreference')
    expect(chipSlots).not.toContain('moveDate')
  })

  it('reads a slot inside the lifestyle or the must-haves', () => {
    const form = formA.parse({ lifestyle: { food: { value: 'veg', source: 'stated' } } })
    expect(slotOf(form, 'lifestyle.food')).toEqual({ value: 'veg', source: 'stated' })
    expect(slotOf(form, 'mustHaves.veg_kitchen').source).toBe('empty')
  })
})
