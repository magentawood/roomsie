import { describe, expect, it } from 'vitest'
import { mergedRuns, type ModelRun } from '../eval/run-file'

const run = (model: string, repeats: number[], ms: number): ModelRun => ({
  model,
  turns: repeats.map((repeat) => ({ id: 'e01', repeat, extractor: null, router: null, label: { version: 1, kinds: [], band: 'core', register: null, danger: false, community: false, notes: false, routerBand: null }, composer: null, judge: null })),
  calls: [{ id: 'e01', role: 'router', ms, outcome: 'ok' }],
})

describe('the run files of the eval (T-61)', () => {
  it('merges two run files into one run for each model, with the repeats of the second file after the repeats of the first', () => {
    const merged = mergedRuns([[run('deepseek-flash', [1, 2, 3], 100), run('gemini-3.5-flash-lite', [1], 50)], [run('deepseek-flash', [1, 2], 200)]])
    expect(merged.map((m) => m.model)).toEqual(['deepseek-flash', 'gemini-3.5-flash-lite'])
    expect(merged[0]!.turns.map((t) => t.repeat)).toEqual([1, 2, 3, 4, 5])
    expect(merged[0]!.calls.map((c) => c.ms)).toEqual([100, 200])
    expect(merged[1]!.turns.map((t) => t.repeat)).toEqual([1])
  })
})
