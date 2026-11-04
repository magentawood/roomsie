import { describe, expect, it } from 'vitest'
import { callStats, flipsOf, mainScript, scoresOf, type TurnResult } from '../eval/score'
import type { EvalSentence } from '../eval/set'

const sentence = (id: string, language: EvalSentence['language'], text: string, expected: EvalSentence['expected']): EvalSentence =>
  ({ id, text, language, script: 'latin', mix: 'none', vague: false, expected })
const sentences = [
  sentence('e01', 'english', 'room in vashi or nerul under 20k', { intent: 'room', areas: ['vashi', 'nerul'], budget: { min: null, max: 20_000 } }),
  sentence('h01', 'hinglish', 'mujhe powai mein room chahiye', { intent: 'room', areas: ['powai'] }),
  sentence('m10', 'marathi', 'रूम घ्यायची की पूर्ण फ्लॅट, गोरेगावमध्ये', { intent: 'unclear', lifestyle: { pets: 'unclear' } }),
]
const label = (language: string, script: string, band = 'core', routerBand: string | null = band) =>
  ({ register: { language, script }, band, routerBand, danger: false, community: false }) as TurnResult['label']
const turns: TurnResult[] = [
  // The areas in a different order, and a move date that the sentence does not name.
  { id: 'e01', repeat: 1, values: { intent: 'room', areas: ['nerul', 'vashi'], budget: { min: null, max: 20_000 }, moveDate: '2026-12-01' }, label: label('english', 'latin') },
  // Hinglish is `hindi`, so `mixed` is wrong. A band below the threshold is a false alarm below it.
  { id: 'h01', repeat: 1, values: { intent: 'room', areas: ['powai'], roomType: 'unclear' }, label: label('mixed', 'latin', 'core', 'out_of_scope') },
  // A vague slot with a value, a vague slot left empty, and a false flag.
  { id: 'm10', repeat: 1, values: { intent: 'whole_flat' }, label: { ...label('marathi', 'devanagari', 'general'), danger: true } },
]

describe('the scores of an eval run (T-27)', () => {
  it('counts the right slots, the made-up values, the vague slots and the labels of the router, for all and for each language', () => {
    const scores = scoresOf(sentences, turns)
    expect(scores.all).toEqual({
      turns: 3, labelled: 5, right: 5, unclearLabels: 2, unclearRight: 0, vagueFilled: 1, madeUp: 1, extraUnclear: 1,
      languageRight: 2, scriptRight: 3, alarmsAbove: 1, alarmsBelow: 1, falseFlags: 1,
    })
    expect(scores.hinglish).toMatchObject({ turns: 1, right: 2, languageRight: 0, extraUnclear: 1, alarmsBelow: 1 })
    expect(scores.marathi).toMatchObject({ turns: 1, labelled: 0, vagueFilled: 1, alarmsAbove: 1, falseFlags: 1 })
  })

  it('takes the script of most of the letters', () => {
    expect(mainScript('ठाणे वेस्टमध्ये 1BHK हवा आहे')).toBe('devanagari')
    expect(mainScript('looking for flat in kandivali east, 45k paryant pahije')).toBe('latin')
  })

  it('gives the median and the 95th percentile of the times, with no failed call', () => {
    const calls = [100, 400, 200, 300].map((ms) => ({ id: 'e01', role: 'router', ms, outcome: 'ok' as const }))
    expect(callStats([...calls, { id: 'e01', role: 'router', ms: 10_000, outcome: 'failed' }, { id: 'e01', role: 'router', ms: 50, outcome: 'invalid' }]))
      .toEqual({ attempts: 6, invalid: 1, failed: 1, medianMs: 200, p95Ms: 400 })
  })

  it('names each sentence whose answer changes between the repeats', () => {
    expect(flipsOf([...turns, { ...turns[0]!, repeat: 2 }, { ...turns[1]!, repeat: 2, values: { intent: 'pg' } }])).toEqual(['h01'])
  })
})
