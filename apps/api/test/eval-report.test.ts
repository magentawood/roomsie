import { describe, expect, it } from 'vitest'
import { reportOf } from '../eval/report'
import type { TurnResult } from '../eval/score'
import type { EvalSentence } from '../eval/set'

const sentence = (id: string, more: Partial<EvalSentence> = {}): EvalSentence =>
  ({ id, text: 'room in powai', language: 'english', script: 'latin', mix: 'none', vague: false, expected: { intent: 'room' }, band: 'core', danger: false, community: false, names: [], ...more })
const sentences = [sentence('e01'), sentence('g01', { band: 'general', text: 'what is a good area' })]
const label = { register: { language: 'english', script: 'latin' }, band: 'core', routerBand: 'core', danger: false, community: false, notes: false } as TurnResult['label']
// A text with no answer of the judge: right script, no failed check, no name.
const composer = { language: 'en', draft: 'Got it: Powai. When do you move?', message: 'room in powai', text: 'Powai, noted. When do you move?', ms: 2000, judgeRegister: null } as TurnResult['composer']
const turns: TurnResult[] = [
  { id: 'e01', repeat: 1, extractorAnswered: true, values: { intent: 'room' }, label, composer },
  { id: 'g01', repeat: 1, extractorAnswered: true, values: {}, label: { ...label, band: 'general', routerBand: 'general' } },
]
const report = reportOf('Report', sentences, [{
  model: 'deepseek-flash', extractorLive: 0.8, routerLive: 0.8, sweep: [{ threshold: 0.8, turns }], repeats: 1,
  calls: [
    { id: 'e01', role: 'extractor', ms: 1000, outcome: 'ok' }, { id: 'g01', role: 'extractor', ms: 9000, outcome: 'ok' },
    { id: 'g01', role: 'router', ms: 5000, outcome: 'ok' },
  ],
}])
const rowOf = (name: string) => report.split('\n').find((line) => line.startsWith(`| ${name} |`))

describe('the report of an eval run (T-61)', () => {
  it('counts the extractor attempts only of the searches with no flag, and the router attempts of each sentence', () => {
    expect(rowOf('Extractor time of one attempt, median / 95th percentile')).toMatch(/^\| [^|]+ \| 1000 \/ 1000 ms \|/)
    expect(rowOf('Router time of one attempt, median / 95th percentile')).toMatch(/^\| [^|]+ \| 5000 \/ 5000 ms \|/)
  })

  it('does not list a text with no answer of the judge as a wrong language', () => {
    expect(report).not.toContain('e01 · en')
  })
})
