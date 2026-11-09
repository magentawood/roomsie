import { describe, expect, it } from 'vitest'
import { formA, panelReady, type FormA, type MatchResult, type ResultsResponse } from '@roomsie/contract'
import { countLine, didntSayLine, formKey, joinPages, nextPage, panelTitle, panelUpdate, type PanelState } from './results'
import { listing, testId } from './test-listing'

const form = (patch: Record<string, unknown> = {}): FormA => formA.parse(patch)
const stated = <V>(value: V) => ({ source: 'stated' as const, value })
const labels: Record<string, string> = { 'powai-vikhroli': 'Powai–Vikhroli', 'bandra-santacruz': 'Bandra–Santacruz', 'andheri-goregaon': 'Andheri–Goregaon' }
const label = (slug: string) => labels[slug] ?? slug

describe('the panel header', () => {
  it('narrows from Everything in Mumbai to a place, an area and a budget', () => {
    expect(panelTitle(form(), label)).toBe('Everything in Mumbai')
    expect(panelTitle(form({ intent: stated('whole_flat') }), label)).toBe('Flats in Mumbai')
    expect(panelTitle(form({ areas: stated(['powai-vikhroli']) }), label)).toBe('Everything in Powai–Vikhroli')
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
  const idle: PanelState<string> = { shown: { key: '0', value: 'page 0' }, pending: null, busy: false }
  const arrive = (key: string) => ({ type: 'arrive' as const, key, value: `page ${key}` })

  it('shows new results at once while the person is idle', () => {
    const state = panelUpdate(panelUpdate(idle, arrive('a')), arrive('b'))
    expect(state.shown).toEqual({ key: 'b', value: 'page b' })
  })

  it('holds new results while the person scrolls, then applies the newest', () => {
    let state = panelUpdate(idle, arrive('a'))
    state = panelUpdate(state, { type: 'busy' })
    state = panelUpdate(state, arrive('b'))
    state = panelUpdate(state, arrive('c'))
    expect(state.shown?.key).toBe('a')
    state = panelUpdate(state, { type: 'idle' })
    expect(state).toEqual({ shown: { key: 'c', value: 'page c' }, pending: null, busy: false })
  })

  it('keeps the header with the results on the screen while the person is busy', () => {
    const under = (max: number) => form({ intent: stated('room'), budget: stated({ min: null, max }) })
    const arriveForm = (f: FormA) => ({ type: 'arrive' as const, key: formKey(f), value: f })
    const start: PanelState<FormA> = { shown: { key: formKey(under(25000)), value: under(25000) }, pending: null, busy: false }
    let state = panelUpdate(panelUpdate(start, { type: 'busy' }), arriveForm(under(20000)))
    expect(panelTitle(state.shown!.value, label)).toBe('Rooms in Mumbai under ₹25,000')
    state = panelUpdate(state, { type: 'idle' })
    expect(panelTitle(state.shown!.value, label)).toBe('Rooms in Mumbai under ₹20,000')
  })

  it('shows the first results at once', () => {
    expect(panelUpdate({ shown: null, pending: null, busy: true }, arrive('a')).shown).toEqual({ key: 'a', value: 'page a' })
  })

  it('adds the next page of the form on the screen at once, also while the person scrolls', () => {
    const state = panelUpdate({ ...idle, busy: true }, { type: 'arrive', key: '0', value: 'pages 1 and 2' })
    expect(state.shown).toEqual({ key: '0', value: 'pages 1 and 2' })
  })

  it('drops the held results when the form goes back to the one on the screen', () => {
    let state = panelUpdate({ ...idle, busy: true }, arrive('a'))
    state = panelUpdate(state, arrive('0'))
    expect(state).toEqual({ shown: { key: '0', value: 'page 0' }, pending: null, busy: true })
  })
})

describe('the pages of a search', () => {
  const place = (n: number): MatchResult => ({ kind: 'listing', listing: listing({ id: testId(n) }), bestMatch: false, didntSay: [] })
  const page = (n: number, patch: Partial<ResultsResponse>): ResultsResponse => ({ results: [], total: 0, page: n, suggestions: [], noticed: [], ...patch })

  it('puts the results of each page in one grid, with the newest total', () => {
    expect(joinPages({ pages: [page(1, { results: [place(1)], total: 21 }), page(2, { results: [place(2)], total: 22 })] }))
      .toEqual({ results: [place(1), place(2)], total: 22, suggested: [], noticed: [] })
  })

  it('puts the suggested posts of each relaxed search in one list', () => {
    const suggestions = [{ relaxed: { kind: 'budget' as const, max: 35000 }, results: [place(3)] }, { relaxed: { kind: 'area' as const, area: 'andheri-goregaon' }, results: [place(4)] }]
    expect(joinPages({ pages: [page(1, { suggestions })] })).toEqual({ results: [], total: 0, suggested: [place(3), place(4)], noticed: [] })
  })

  it('asks for the next page until the pages hold the total', () => {
    expect(nextPage({ page: 1, total: 21 })).toBe(2)
    expect(nextPage({ page: 1, total: 20 })).toBeUndefined()
    expect(nextPage({ page: 2, total: 40 })).toBeUndefined()
    expect(nextPage({ page: 1, total: 0 })).toBeUndefined()
  })
})
