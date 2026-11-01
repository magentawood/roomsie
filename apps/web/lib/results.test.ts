import { describe, expect, it } from 'vitest'
import { formA, type FormA } from '@roomsie/contract'
import { countLine, didntSayLine, formKey, panelReady, panelTitle, panelUpdate, type PanelState } from './results'

const form = (patch: Record<string, unknown> = {}): FormA => formA.parse(patch)
const stated = <V>(value: V) => ({ source: 'stated' as const, value })
const labels: Record<string, string> = { 'powai-vikhroli': 'Powai–Vikhroli', 'bandra-santacruz': 'Bandra–Santacruz', 'andheri-goregaon': 'Andheri–Goregaon' }
const label = (slug: string) => labels[slug] ?? slug

describe('the panel header', () => {
  it('narrows from Everything in Mumbai to a place, an area and a budget', () => {
    expect(panelTitle(form(), label)).toBe('Everything in Mumbai')
    expect(panelTitle(form({ intent: stated('whole_flat') }), label)).toBe('Flats in Mumbai')
    expect(panelTitle(form({ intent: stated('room'), areas: stated(['powai-vikhroli']) }), label)).toBe('Rooms in Powai–Vikhroli')
    expect(panelTitle(form({ intent: stated('flatmates'), areas: stated(['powai-vikhroli']), budget: stated({ min: null, max: 20000 }) }), label))
      .toBe('People in Powai–Vikhroli under ₹20,000')
  })

  it('names two areas, then counts the rest', () => {
    expect(panelTitle(form({ intent: stated('pg'), areas: stated(['powai-vikhroli', 'bandra-santacruz']) }), label)).toBe('PGs in Powai–Vikhroli and Bandra–Santacruz')
    expect(panelTitle(form({ intent: stated('pg'), areas: stated(['powai-vikhroli', 'bandra-santacruz', 'andheri-goregaon', 'thane']) }), label))
      .toBe('PGs in Powai–Vikhroli, Bandra–Santacruz and 2 more')
  })

  it('writes each kind of budget', () => {
    const scope = (budget: NonNullable<FormA['budget']['value']>) => panelTitle(form({ intent: stated('room'), budget: stated(budget) }), label)
    expect(scope({ min: 10000, max: 20000 })).toBe('Rooms in Mumbai ₹10,000 to ₹20,000')
    expect(scope({ min: 35000, max: null })).toBe('Rooms in Mumbai from ₹35,000')
  })

  it('treats an unclear intent as no intent', () => {
    expect(panelTitle(form({ intent: stated('unclear') }), label)).toBe('Everything in Mumbai')
  })

  it('counts the results', () => {
    expect(countLine(1)).toBe('1 result')
    expect(countLine(24)).toBe('24 results')
  })
})

describe('when the panel shows', () => {
  it('waits for intent, area and budget', () => {
    expect(panelReady(form({ intent: stated('room'), areas: stated(['powai-vikhroli']) }))).toBe(false)
    expect(panelReady(form({ intent: stated('unclear'), areas: stated(['powai-vikhroli']), budget: stated({ min: null, max: 20000 }) }))).toBe(false)
    expect(panelReady(form({ intent: stated('room'), areas: stated(['powai-vikhroli']), budget: stated({ min: null, max: 20000 }) }))).toBe(true)
  })
})

describe('the form key', () => {
  it('changes with a value or a weight', () => {
    const base = form({ intent: stated('room') })
    expect(formKey(form({ intent: stated('pg') }))).not.toBe(formKey(base))
    expect(formKey(form({ intent: stated('room'), mustHaves: { veg_kitchen: stated('prefer') } })))
      .not.toBe(formKey(form({ intent: stated('room'), mustHaves: { veg_kitchen: stated('dealbreaker') } })))
  })

  it('does not change when a default is confirmed', () => {
    expect(formKey(form({ intent: { source: 'default', value: 'room' } }))).toBe(formKey(form({ intent: stated('room') })))
  })
})

describe('the Didn’t say label', () => {
  it('names the answers that a card did not give', () => {
    expect(didntSayLine({ kind: 'person', didntSay: ['non_smokers'] })).toBe('Didn’t say: smoking')
    expect(didntSayLine({ kind: 'listing', didntSay: ['veg_kitchen', 'couple_friendly'] })).toBe('Didn’t say: kitchen, who’s welcome')
  })

  it('names one answer once, and shows nothing for a full match', () => {
    expect(didntSayLine({ kind: 'person', didntSay: ['women_only', 'men_only'] })).toBe('Didn’t say: gender')
    expect(didntSayLine({ kind: 'person', didntSay: [] })).toBeNull()
  })
})

describe('the update rule', () => {
  const idle: PanelState<string> = { shown: { key: '0', page: 'page 0' }, pending: null, busy: false }
  const arrive = (key: string) => ({ type: 'arrive' as const, key, page: `page ${key}` })

  it('shows new results at once while the person is idle', () => {
    const state = panelUpdate(panelUpdate(idle, arrive('a')), arrive('b'))
    expect(state.shown).toEqual({ key: 'b', page: 'page b' })
  })

  it('holds new results while the person scrolls, then applies the newest', () => {
    let state = panelUpdate(idle, arrive('a'))
    state = panelUpdate(state, { type: 'busy' })
    state = panelUpdate(state, arrive('b'))
    state = panelUpdate(state, arrive('c'))
    expect(state.shown.key).toBe('a')
    state = panelUpdate(state, { type: 'idle' })
    expect(state).toEqual({ shown: { key: 'c', page: 'page c' }, pending: null, busy: false })
  })

  it('ignores results for the form that is already on the screen', () => {
    const state = panelUpdate(idle, arrive('a'))
    expect(panelUpdate(state, { type: 'arrive', key: 'a', page: 'reordered' })).toBe(state)
  })
})
