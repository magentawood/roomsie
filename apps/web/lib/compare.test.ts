import { describe, expect, it } from 'vitest'
import type { Comparison, MatchResult } from '@roomsie/contract'
import { toggled } from './chat'
import { aboutOf, askedPick, askPlaceholder, compareOf, compareRefusal, firstFields, fieldsOf, isFull, questionOf, shownOf, storedPick, tableOf, toggledPick, type Picked } from './compare'

const place = (id: string): Picked => ({ kind: 'place', id, name: `Place ${id}` })
const person = (id: string): Picked => ({ kind: 'person', id, name: `Person ${id}` })

describe('the selection of cards (T-49)', () => {
  it('adds a card, and a second tap clears it', () => {
    expect(toggledPick([], place('a'))).toEqual([place('a')])
    expect(toggledPick([place('a'), place('b')], place('a'))).toEqual([place('b')])
  })

  it('starts a new selection with a card of the other kind', () => {
    expect(toggledPick([place('a'), place('b')], person('p'))).toEqual([person('p')])
  })

  it('takes at most four cards', () => {
    const four = ['a', 'b', 'c', 'd'].map(place)
    expect(toggledPick(four, place('e'))).toEqual(four)
  })

  it('asks for a comparison only with two cards or more, in the order of the results', () => {
    expect(compareOf([], ['a'])).toBeNull()
    expect(compareOf([place('a')], ['a'])).toEqual({ kind: 'place', ids: ['a'] })
    expect(compareOf([place('c'), place('a'), place('x')], ['a', 'b', 'c'])).toEqual({ kind: 'place', ids: ['a', 'c', 'x'] })
  })
})

describe('"Ask in chat": the card as a chip above the input', () => {
  it('adds the card, and a second "Ask in chat" keeps it', () => {
    expect(askedPick([], place('a'))).toEqual([place('a')])
    expect(askedPick([place('a'), place('b')], place('a'))).toEqual([place('a'), place('b')])
  })

  it('starts a new selection with a card of the other kind', () => {
    expect(askedPick([place('a'), place('b')], person('p'))).toEqual([person('p')])
  })

  it('takes no fifth card of a kind, and says so', () => {
    const four = ['a', 'b', 'c', 'd'].map(place)
    expect(askedPick(four, place('e'))).toEqual(four)
    expect(isFull(four, place('e'))).toBe(true)
    expect(isFull(four, place('a'))).toBe(false)
    expect(isFull(four, person('p'))).toBe(false)
    expect(isFull(four.slice(1), place('e'))).toBe(false)
  })

  it('sends a question about one card with its name, and a comparison as the person typed it', () => {
    const question = questionOf('is it furnished?', [place('a')])
    expect(question).toBe('About “Place a”: is it furnished?')
    expect(aboutOf(question)).toEqual({ name: 'Place a', text: 'is it furnished?' })
    expect(questionOf('which is cheaper?', [place('a'), place('b')])).toBe('which is cheaper?')
    expect(questionOf('is she vegetarian?', [{ kind: 'person', id: 'p', name: 'Asha Rao' }])).toBe('About “Asha”: is she vegetarian?')
    expect(questionOf('2 bhk in Bandra', [])).toBe('2 bhk in Bandra')
  })

  it('asks about one card or about the cards in the empty input', () => {
    expect(askPlaceholder([])).toBeUndefined()
    expect(askPlaceholder([place('a')])).toBe('Ask about this listing…')
    expect(askPlaceholder([place('a'), place('b')])).toBe('Ask about the listings…')
    expect(askPlaceholder([person('p')])).toBe('Ask about this person…')
    expect(askPlaceholder([person('p'), person('q')])).toBe('Ask about these people…')
  })

  it('shows a chip only for a question that the chat made, also over two lines', () => {
    expect(aboutOf('About “Place a”: first line\nsecond line')).toEqual({ name: 'Place a', text: 'first line\nsecond line' })
    expect(aboutOf('About Bandra: is it safe?')).toBeNull()
    expect(aboutOf('2 bhk in Bandra')).toBeNull()
  })

  it('reads the card that a page left for the chat, and nothing else', () => {
    expect(storedPick(JSON.stringify(place('a')))).toEqual(place('a'))
    expect(storedPick(JSON.stringify({ kind: 'person', id: 'p', name: 'Person p', extra: 1 }))).toEqual(person('p'))
    for (const value of [null, '', 'not json', '{"kind":"car","id":"a","name":"x"}', '{"kind":"place","id":1,"name":"x"}', '"About x: "']) expect(storedPick(value)).toBeNull()
  })
})

const places: Comparison = {
  kind: 'place',
  options: [
    { id: 'a', title: 'Private room in 3BHK', rent: 20_000, deposit: 40_000, moveInCash: 60_000, maintenance: null, brokerage: null, nearestStation: 'Bandra', walkStation: '10_min', availableFrom: null, minStay: null, furnishing: 'semi', verified: true },
    { id: 'b', title: 'Shivraj PG', rent: 12_000, deposit: null, moveInCash: 12_000, maintenance: 500, brokerage: null, nearestStation: null, walkStation: null, availableFrom: '2026-12-01', minStay: '6_months', furnishing: null, verified: false },
  ],
}

describe('the table of a comparison', () => {
  it('starts with the rows of the design, and a dash for a field with no value', () => {
    expect(tableOf(places, firstFields.place)).toEqual([
      { field: 'rent', label: 'Rent', cells: ['₹20,000/mo', '₹12,000/mo'] },
      { field: 'moveInCash', label: 'Move-in cash', cells: ['₹60,000', '₹12,000'] },
      { field: 'deposit', label: 'Deposit', cells: ['₹40,000', '—'] },
      { field: 'station', label: 'Station', cells: ['Bandra, 10 minute walk', '—'] },
    ])
  })

  it('adds and removes the rows of the picker, in the order of the fields', () => {
    const withFurnishing = toggled(firstFields.place, 'furnishing')
    expect(tableOf(places, withFurnishing).map((row) => row.label)).toEqual(['Rent', 'Move-in cash', 'Deposit', 'Station', 'Furnishing'])
    expect(tableOf(places, toggled(withFurnishing, 'deposit')).map((row) => row.label)).toEqual(['Rent', 'Move-in cash', 'Station', 'Furnishing'])
  })

  it('gives people the seven first rows, and the picker each field of the card', () => {
    expect(firstFields.person).toEqual(['age', 'jobRole', 'budget', 'moveDate', 'food', 'smoking', 'verified'])
    expect(fieldsOf('person').map((field) => field.label)).toEqual(expect.arrayContaining(['Age', 'Job', 'Budget', 'Move date', 'Food', 'Smoking', 'Verified', 'Pets']))
    const people: Comparison = {
      kind: 'person',
      options: [
        { id: 'p', fullName: 'Asha Rao', age: 25, jobRole: 'Designer', whosMoving: 'working', budgetMin: null, budgetMax: 20_000, moveDate: null, lifestyle: { food: 'veg' }, verified: true },
        { id: 'q', fullName: 'Ravi Shah', age: null, jobRole: null, whosMoving: 'student', budgetMin: 10_000, budgetMax: 15_000, moveDate: '2026-12-01', lifestyle: {}, verified: false },
      ],
    }
    expect(tableOf(people, ['age', 'budget', 'food', 'verified'])).toEqual([
      { field: 'age', label: 'Age', cells: ['25 yrs', '—'] },
      { field: 'budget', label: 'Budget', cells: ['Under ₹20,000', '₹10,000 to ₹15,000'] },
      { field: 'food', label: 'Food', cells: ['Veg', '—'] },
      { field: 'verified', label: 'Verified', cells: ['Yes', 'No'] },
    ])
  })
})

describe('the refusal of a comparison', () => {
  it('names the minutes of a deploy and a card that closed, and leaves other refusals as they are', () => {
    expect(compareRefusal('not valid: body')).toMatch(/few minutes/)
    expect(compareRefusal('not valid: compare')).toMatch(/no longer open/)
    expect(compareRefusal('not valid: text')).toBeNull()
  })
})

describe('the cards on the screen of a question with no selection', () => {
  const listing = (id: string) => ({ kind: 'listing', listing: { id, kind: 'room_in_flat', pgName: null, placeType: '2bhk', roomType: 'private' }, bestMatch: false, didntSay: [] }) as unknown as MatchResult
  it('sends the open card, else the first four results, and nothing with no results', () => {
    const results = ['a', 'b', 'c', 'd', 'e'].map(listing)
    expect(shownOf({ kind: 'person', id: 'p' }, results)).toEqual({ kind: 'person', ids: ['p'] })
    expect(shownOf(null, results)).toEqual({ kind: 'place', ids: ['a', 'b', 'c', 'd'] })
    expect(shownOf(null, [])).toBeNull()
  })
})
