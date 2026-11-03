import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formA } from '@roomsie/contract'
import { chatStorage, forgetChat, writeStored } from './chat'
import { joinedPlaces, panelContent, placeOf, rememberJoin } from './waitlist'

const stated = <T,>(value: T) => ({ source: 'stated' as const, value })
const ready = formA.parse({ intent: stated('room'), areas: stated(['bandra']), budget: stated({ min: null, max: 25_000 }) })

describe('the content of the panel (PD6c)', () => {
  it('gives the results for a Mumbai sub-area or area group', () => {
    expect(panelContent(ready, [])).toBe('results')
    expect(panelContent(formA.parse({ ...ready, areas: stated(['powai-vikhroli']) }), [])).toBe('results')
  })

  it('gives the waitlist screen for a place outside Mumbai with no Mumbai area, also before the place type and the budget', () => {
    expect(panelContent(formA.parse({}), ['pune'])).toBe('waitlist')
    expect(panelContent(formA.parse({ intent: stated('room') }), ['pune'])).toBe('waitlist')
  })

  it('gives the results and one waitlist line for Mumbai and a place outside it', () => {
    expect(panelContent(ready, ['pune'])).toBe('results-with-line')
  })

  it('gives no panel before the search is ready', () => {
    expect(panelContent(formA.parse({ intent: stated('room') }), [])).toBeNull()
  })
})

describe('the typed area of the waitlist form', () => {
  it('gives the place of a name or an other name, with any case and spaces', () => {
    expect(placeOf('Pune')).toBe('pune')
    expect(placeOf('  bangalore ')).toBe('bengaluru')
    expect(placeOf('Vasai-Virar')).toBe('vasai-virar')
    expect(placeOf('Vasai Virar')).toBe('vasai-virar')
    expect(placeOf('Pimpri-Chinchwad')).toBe('pune')
    expect(placeOf('पुणे')).toBe('pune')
  })

  it('gives no place for a Mumbai area or an unknown name', () => {
    expect(placeOf('Bandra')).toBeNull()
    expect(placeOf('Atlantis')).toBeNull()
    expect(placeOf('')).toBeNull()
  })
})

describe('the memory of a join', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('keeps each place for each chat, and forgets them at sign-out', () => {
    rememberJoin('goal-1', 'pune')
    rememberJoin('goal-1', 'pune')
    rememberJoin('goal-1', 'nashik')
    expect([joinedPlaces('goal-1'), joinedPlaces('goal-2')]).toEqual([['pune', 'nashik'], []])
    forgetChat()
    expect(joinedPlaces('goal-1')).toEqual([])
  })

  it('reads nothing from a stored value that is not valid', () => {
    writeStored(chatStorage.waitlist, '{"goal-1":["atlantis"]}')
    expect(joinedPlaces('goal-1')).toEqual([])
  })
})
