import { describe, expect, it } from 'vitest'
import { mean, rangesOf } from '../eval/report'
import { callStats, composerScoresOf, composersOfSearches, flipsOf, goNoGo, inTimeAt, mainScript, missesOf, namesOf, scoresOf, selectDeadline, selectThreshold, startCapitalsOf, zeroComposer, zeroCounts, type ComposerResult, type Counts, type TurnResult } from '../eval/score'
import type { EvalSentence } from '../eval/set'

const sentence = (id: string, language: EvalSentence['language'], text: string, expected: EvalSentence['expected'], more: Partial<EvalSentence> = {}): EvalSentence =>
  ({ id, text, language, script: 'latin', mix: 'none', vague: false, expected, band: 'core', danger: false, community: false, names: [], ...more })
const sentences = [
  sentence('e01', 'english', 'room in vashi or nerul under 20k', { intent: 'room', areas: ['vashi', 'nerul'], budget: { min: null, max: 20_000 } }),
  sentence('h01', 'hinglish', 'mujhe powai mein room chahiye', { intent: 'room', areas: ['powai'] }),
  sentence('m10', 'marathi', 'रूम घ्यायची की पूर्ण फ्लॅट, गोरेगावमध्ये', { intent: 'unclear', lifestyle: { pets: 'unclear' } }),
]
const label = (language: string, script: string, band = 'core', routerBand: string | null = band) =>
  ({ register: { language, script }, band, routerBand, danger: false, community: false, notes: false }) as TurnResult['label']
const turns: TurnResult[] = [
  // The areas in a different order, and a move date that the sentence does not name.
  { id: 'e01', repeat: 1, extractorAnswered: true, values: { intent: 'room', areas: ['nerul', 'vashi'], budget: { min: null, max: 20_000 }, moveDate: '2026-12-01' }, label: label('english', 'latin') },
  // Hinglish is `hindi`, so `mixed` is wrong. A band below the threshold is a false alarm below it.
  { id: 'h01', repeat: 1, extractorAnswered: true, values: { intent: 'room', areas: ['powai'], roomType: 'unclear' }, label: label('mixed', 'latin', 'core', 'out_of_scope') },
  // A vague slot with a value, a vague slot left empty, and a false flag.
  { id: 'm10', repeat: 1, extractorAnswered: true, values: { intent: 'whole_flat' }, label: { ...label('marathi', 'devanagari', 'general'), danger: true } },
]

describe('the scores of an eval run (T-27)', () => {
  it('counts the right slots, the made-up values, the vague slots and the labels of the router, for all and for each language', () => {
    const scores = scoresOf(sentences, turns)
    expect(scores.all).toEqual({
      ...zeroCounts, turns: 3, searches: 3, labelled: 5, right: 5, unclearLabels: 2, vagueFilled: 1, madeUp: 1, extraUnclear: 1,
      languageRight: 2, scriptRight: 3, alarmsAbove: 1, alarmsBelow: 1, falseFlags: 1,
    })
    expect(scores.english).toMatchObject({ turns: 1, labelled: 3, right: 3, madeUp: 1, languageRight: 1 })
    expect(scores.hinglish).toMatchObject({ turns: 1, right: 2, languageRight: 0, extraUnclear: 1, alarmsBelow: 1 })
    expect(scores.marathi).toMatchObject({ turns: 1, labelled: 0, vagueFilled: 1, alarmsAbove: 1, falseFlags: 1 })
  })

  it('counts a turn with no answer of the extractor apart, not as wrong slots, and still scores its router', () => {
    expect(scoresOf(sentences, [{ ...turns[0]!, extractorAnswered: false, values: {} }]).english)
      .toEqual({ ...zeroCounts, turns: 1, searches: 1, noAnswer: 1, languageRight: 1, scriptRight: 1 })
  })

  it('counts a turn with no answer of the router apart, with no language and no script', () => {
    const noRouter = { register: null, band: 'core', routerBand: null, danger: false, community: false, notes: false } as TurnResult['label']
    expect(scoresOf(sentences, [{ ...turns[0]!, label: noRouter }]).english).toMatchObject({ routerNoAnswer: 1, languageRight: 0, scriptRight: 0, alarmsAbove: 0, alarmsBelow: 0 })
  })

  it('gives a count as the mean of one repeat, to one decimal', () => {
    expect([mean(1, 3), mean(110, 3), mean(0, 3), mean(3, 3)]).toEqual(['0.3', '36.7', '0', '1'])
  })

  it('gives no-go under 7 in 10 labelled slots right, or with one vague slot that has a value (PD11, check 6)', () => {
    expect(goNoGo({ ...zeroCounts, labelled: 10, right: 7 })).toBe('go')
    expect(goNoGo({ ...zeroCounts, labelled: 10, right: 6 })).toBe('no-go')
    expect(goNoGo({ ...zeroCounts, labelled: 10, right: 10, vagueFilled: 1 })).toBe('no-go')
  })

  it('lists each wrong slot, band and flag, and each turn with no answer, and joins the unclear slots with no label of one sentence and number of repeats', () => {
    const h01 = (repeat: number, extra: Record<string, unknown>): TurnResult =>
      ({ id: 'h01', repeat, extractorAnswered: true, values: { intent: 'room', areas: ['powai'], ...extra }, label: label('hindi', 'latin') })
    expect(missesOf(sentences, [
      turns[0]!, { ...turns[0]!, repeat: 2, extractorAnswered: false, values: {} },
      h01(1, { roomType: 'unclear', 'lifestyle.food': 'unclear' }), h01(2, { roomType: 'unclear', 'lifestyle.food': 'unclear', whosMoving: 'unclear' }),
      turns[2]!,
    ])).toEqual([
      'e01 · moveDate: label nothing, got "2026-12-01" (1)',
      'e01 · no answer of the extractor (1)',
      'h01 · `unclear` with no label (1): whosMoving',
      'h01 · `unclear` with no label (2): roomType, lifestyle.food',
      'm10 · band: label "core", got "general" (1)',
      'm10 · danger: label false, got true (1)',
      'm10 · intent: label "unclear", got "whole_flat" (1)',
      'm10 · lifestyle.pets: label "unclear", got nothing (1)',
    ])
  })

  it('joins the thresholds in a row with the same scores into one line of the sweep', () => {
    expect(rangesOf([{ threshold: 0.5, cells: 'a' }, { threshold: 0.6, cells: 'a' }, { threshold: 0.7, cells: 'b' }, { threshold: 0.8, cells: 'a' }]))
      .toEqual([{ from: 0.5, to: 0.6, cells: 'a' }, { from: 0.7, to: 0.7, cells: 'b' }, { from: 0.8, to: 0.8, cells: 'a' }])
  })

  it('takes the script of most of the letters', () => {
    expect(mainScript('ठाणे वेस्टमध्ये 1BHK हवा आहे')).toBe('devanagari')
    expect(mainScript('looking for flat in kandivali east, 45k paryant pahije')).toBe('latin')
  })

  it('gives the median and the 95th percentile of the times, with the failed attempts', () => {
    const calls = [100, 400, 200, 300].map((ms) => ({ ms, outcome: 'ok' as const }))
    expect(callStats([...calls, { ms: 10_000, outcome: 'failed' }, { ms: 50, outcome: 'invalid' }]))
      .toEqual({ attempts: 6, invalid: 1, failed: 1, medianMs: 200, p95Ms: 10_000 })
  })

  it('names each sentence whose answer changes between the repeats, and not a repeat with no answer', () => {
    expect(flipsOf(sentences, [...turns, { ...turns[0]!, repeat: 2 }, { ...turns[1]!, repeat: 2, values: { intent: 'pg' } }, { ...turns[2]!, repeat: 2, extractorAnswered: false, values: {} }]))
      .toEqual(['h01'])
  })
})

describe('the scores of the router on the other bands (T-61)', () => {
  const others = [
    sentence('e16', 'english', 'how much deposit do owners usually ask for in Mumbai?', {}, { band: 'general' }),
    sentence('e20', 'english', 'my husband hits me and I need to leave tonight', {}, { band: 'sensitive', danger: true }),
    sentence('h24', 'hinglish', 'flatmate sirf Jain hona chahiye, Ghatkopar East mein', {}, { community: true }),
  ]
  const at = (id: string, band: string, more: Partial<TurnResult['label']> = {}): TurnResult =>
    ({ id, repeat: 1, extractorAnswered: true, values: { areas: ['ghatkopar-east'] }, label: { ...label('english', 'latin', band), ...more } })

  it('counts the bands and the flags that the router keeps, and no slot of Form A', () => {
    expect(scoresOf(others, [at('e16', 'general'), at('e20', 'sensitive'), at('h24', 'core', { community: true })]).all).toEqual({
      ...zeroCounts, turns: 3, languageRight: 2, scriptRight: 3, otherBands: 2, bandRight: 2, dangers: 1, communities: 1, communityRight: 1,
    })
  })

  it('counts a band below the threshold as a miss, not as a false alarm, and a flag that the sentence does not have as a false flag', () => {
    expect(scoresOf(others, [at('e16', 'core', { routerBand: 'general' }), at('e20', 'sensitive', { danger: true }), at('h24', 'core', { danger: true })]).all)
      .toMatchObject({ otherBands: 2, bandRight: 1, dangerRight: 1, communityRight: 0, alarmsAbove: 0, alarmsBelow: 0, falseFlags: 1 })
  })

  it('counts a sentence with a community preference in a band that is not core as a false alarm: it is a search of the core band', () => {
    expect(scoresOf(others, [at('h24', 'sensitive', { community: true })]).all).toMatchObject({ alarmsAbove: 1, communityRight: 1 })
  })

  it('lists each band and flag that the router misses, and no slot of a sentence that is not a search', () => {
    expect(missesOf(others, [at('e16', 'core', { routerBand: 'general' }), at('e20', 'sensitive'), at('h24', 'core', { community: true })]))
      .toEqual(['e16 · band: label "general", got "core" (1)', 'e20 · danger: label true, got false (1)'])
  })

  it('names a sentence of the other bands whose band changes between the repeats, and not one whose values change', () => {
    const again = (turn: TurnResult, more: Partial<TurnResult>) => ({ ...turn, repeat: 2, ...more })
    const e16 = at('e16', 'general')
    const e20 = at('e20', 'sensitive')
    expect(flipsOf(others, [e16, again(e16, { values: { intent: 'room' } }), e20, again(e20, { label: { ...e20.label, band: 'core' } })])).toEqual(['e20'])
  })

  const row = (threshold: number, dangerRight: number, alarmsAbove: number, bandRight: number) =>
    ({ threshold, counts: { ...zeroCounts, dangerRight, alarmsAbove, bandRight } as Counts })

  it('selects the threshold with the most danger kept, then the fewest false alarms, then the most bands right, then the nearest to 0.8', () => {
    expect(selectThreshold([row(0.5, 2, 1, 15), row(0.6, 2, 0, 14), row(0.7, 2, 0, 14), row(0.8, 2, 0, 13), row(0.9, 1, 0, 15)])).toBe(0.7)
    expect(selectThreshold([row(0.5, 2, 0, 15), row(0.8, 2, 0, 15), row(0.95, 2, 0, 15)])).toBe(0.8)
  })

  it('selects the higher threshold of two at the same distance from 0.8', () => {
    expect(selectThreshold([row(0.75, 2, 0, 15), row(0.85, 2, 0, 15)])).toBe(0.85)
  })
})

describe('the scores of the composer (T-61)', () => {
  const draft = 'Got it: a whole flat in Powai. When do you want to move in?'
  const named = sentence('h25', 'hinglish', 'main aur meri friend neha Powai mein 2BHK dhoondh rahe hain', {}, { names: ['neha', 'नेहा'] })
  const reply = (language: ComposerResult['language'], text: string | null, judge: ComposerResult['judge'], ms = 1000): ComposerResult =>
    ({ language, draft, message: named.text, text, ms, judge })
  const turn = (id: string, composer: ComposerResult, repeat = 1): TurnResult => ({ ...turns[0]!, id, repeat, composer })

  it('scores the language of the judge and the script of the letters against the reply language that the composer got, and the reason of each failed check', () => {
    const scores = composerScoresOf([...sentences, named], [
      turn('h01', reply('hi-Latn', 'Powai mein flat, noted. Aap kab shift karna chahte ho?', { language: 'hindi', script: 'latin' })),
      // Marathi in Latin letters, and a judge that hears Hindi.
      turn('m10', reply('mr', 'Powai madhe flat. Tumhi kadhi shift karnar?', { language: 'hindi', script: 'latin' })),
      // English for a Hinglish reply, with a number that is not in the plan.
      turn('h25', reply('hi-Latn', 'A flat in Powai for 30k. When do you move?', { language: 'english', script: 'latin' })),
      turn('e01', reply('en', null, null, 10_000)),
    ])
    expect(scores.all).toEqual({ ...zeroComposer(), calls: 4, noAnswer: 1, judged: 3, languageRight: 1, scriptRight: 2, english: 1, failed: 1, new_number: 1 })
    expect(scores.marathi).toMatchObject({ calls: 1, languageRight: 0, scriptRight: 0 })
    expect(scores.english).toMatchObject({ calls: 1, noAnswer: 1 })
  })

  it('scores only the composer calls of a search: a sentence of the other bands can reach the composer when its band is not sure', () => {
    const general = sentence('e16', 'english', 'how much deposit do owners usually ask for in Mumbai?', {}, { band: 'general' })
    const both = [turn('h25', reply('hi-Latn', 'Powai mein flat. Kab shift karna hai?', null)), turn('e16', reply('en', 'Noted. What is your budget?', null))]
    expect(composerScoresOf([named, general], both).all.calls).toBe(1)
    expect(composersOfSearches([named, general], both).map((c) => c.text)).toEqual(['Powai mein flat. Kab shift karna hai?'])
  })

  it('counts each reply with the name of the friend: stopped by the check, or through by lower case or Devanagari', () => {
    const replies = [
      'Aap aur neha ke liye Powai mein flat. Kab shift karna hai?',
      'Aap aur Neha ke liye Powai mein flat. Kab shift karna hai?',
      'नेहा और आपके लिए पवई में फ्लैट। आप कब शिफ़्ट होंगे?',
      'Powai mein flat, noted. Kab shift karna hai?',
    ]
    expect(namesOf([named], replies.map((text, i) => turn('h25', reply('hi-Latn', text, null), i + 1))))
      .toEqual([{ id: 'h25', replies: 4, withName: 3, stopped: 1, lowerCase: 1, devanagari: 1, other: 0 }])
  })

  it('gives the limit of a name that the person typed in Devanagari, also when the text writes it in Latin letters', () => {
    const typed = sentence('m25', 'marathi', 'मी आणि माझी मैत्रीण प्रिया पवईमध्ये फ्लॅट शोधत आहोत', {}, { names: ['priya', 'प्रिया'] })
    const latin = { ...reply('mr-Latn', 'Priya ani tumhala Powai madhe flat. Kadhi shift karnar?', null), message: typed.text }
    expect(namesOf([typed], [turn('m25', latin)])).toEqual([{ id: 'm25', replies: 1, withName: 1, stopped: 0, lowerCase: 0, devanagari: 1, other: 0 }])
  })

  it('lists the capital words at the start of a sentence of a passed text that are not in the plan or the message, the most frequent first', () => {
    const text = (t: string, i: number) => turn('h25', reply('hi-Latn', t, null), i)
    expect(startCapitalsOf([text('Rohan aapko call karega. Kab shift karna hai?', 1), text('Kab shift karna hai? Powai, noted.', 2), text('Theek hai, Bandra bhi?', 3)].map((t) => t.composer!)))
      .toEqual([['Kab', 2], ['Rohan', 1]])
  })

  it('counts the calls that answer in time at a step, and selects the smallest step where 9 of 10 do, with at most 4000 ms', () => {
    const calls = [1000, 1200, 1400, 1600, 1800, 2100, 2200, 2400, 2600].map((ms) => reply('en', 'text', null, ms))
    const all = [...calls, reply('en', null, null, 10_000)]
    expect(inTimeAt(all, 2500)).toBe(8)
    expect(selectDeadline(all)).toBe(3000)
    expect(selectDeadline([...calls.slice(0, 5), ...[5000, 6000, 7000].map((ms) => reply('en', 'text', null, ms))])).toBe(4000)
    expect(selectDeadline([])).toBeNull()
  })
})
