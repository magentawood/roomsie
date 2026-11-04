import { callStats, flipsOf, missesOf, scoresOf, type CallResult, type Counts, type TurnResult } from './score'
import type { EvalSentence } from './set'

/** The scores of one model at each threshold of the sweep. `live` is the threshold of the settings. */
export type ModelScores = { model: string; live: number; sweep: { threshold: number; turns: TurnResult[] }[]; calls: CallResult[]; repeats: number }

const share = (part: number, whole: number) => (whole ? `${Math.round((100 * part) / whole)}% (${part}/${whole})` : '—')
const groups = ['all', 'english', 'hinglish', 'marathi'] as const
const rows: [string, (c: Counts) => string][] = [
  ['Labelled slots right', (c) => share(c.right, c.labelled)],
  ['Made-up values', (c) => String(c.madeUp)],
  ['Vague slots marked unclear', (c) => share(c.unclearRight, c.unclearLabels)],
  ['Vague slots with a value', (c) => String(c.vagueFilled)],
  ['Unclear in a slot with no label', (c) => String(c.extraUnclear)],
  ['Router language right', (c) => share(c.languageRight, c.turns)],
  ['Router main script right', (c) => share(c.scriptRight, c.turns)],
  ['False alarms, above / below the threshold', (c) => `${c.alarmsAbove} / ${c.alarmsBelow}`],
  ['False flags', (c) => String(c.falseFlags)],
]

/** PD11, check 6: no-go if fewer than 7 in 10 slots are right, or a vague slot gets a value. */
const pd11 = (c: Counts) => (c.right >= 0.7 * c.labelled && c.vagueFilled === 0 ? 'go' : 'no-go')

function modelReport(sentences: EvalSentence[], { model, live, sweep, calls, repeats }: ModelScores) {
  const turns = sweep.find((s) => s.threshold === live)!.turns
  const scores = scoresOf(sentences, turns)
  const language = new Map(sentences.map((s) => [s.id, s.language]))
  const invalid = groups.map((group) => {
    const { attempts, invalid } = callStats(calls.filter((c) => group === 'all' || language.get(c.id) === group))
    return `${invalid} of ${attempts}`
  })
  const roles = [...new Set(calls.map((c) => c.role))].map((role) => {
    const { attempts, invalid, failed, medianMs, p95Ms } = callStats(calls.filter((c) => c.role === role))
    return `| ${role} | ${attempts} | ${invalid} | ${failed} | ${medianMs ?? '—'} | ${p95Ms ?? '—'} |`
  })
  const sweepRows = sweep.map(({ threshold, turns }) => {
    const c = scoresOf(sentences, turns).all
    return `| ${threshold}${threshold === live ? ' (live)' : ''} | ${share(c.right, c.labelled)} | ${c.madeUp} | ${share(c.unclearRight, c.unclearLabels)} | ${c.vagueFilled} | ${pd11(c)} |`
  })
  const flips = flipsOf(turns)
  return [
    `## ${model}`, '',
    `At the threshold ${live}, ${repeats} repeats of each sentence. PD11 check 6: **${pd11(scores.all)}**.`, '',
    '| | All | English | Hinglish | Marathi |', '|---|---|---|---|---|',
    ...rows.map(([name, cell]) => `| ${name} | ${groups.map((g) => cell(scores[g])).join(' | ')} |`),
    `| Output not valid, of the attempts | ${invalid.join(' | ')} |`, '',
    '| Call | Attempts | Not valid | Failed | Median ms | 95th percentile ms |', '|---|---|---|---|---|---|', ...roles, '',
    '### The threshold sweep', '', 'The recorded answers again, through the extractor at each threshold, with no new call.', '',
    '| Threshold | Labelled slots right | Made-up values | Vague slots marked unclear | Vague slots with a value | PD11 |', '|---|---|---|---|---|---|', ...sweepRows, '',
    '### The misses', '', `At ${live}, with the number of repeats of ${repeats}.`, '',
    ...missesOf(sentences, turns).map(([miss, n]) => `- ${miss} (${n})`), '',
    `**Answers that change between the repeats:** ${flips.join(', ') || 'none'}.`, '',
  ].join('\n')
}

export const reportOf = (title: string, sentences: EvalSentence[], models: ModelScores[]) =>
  [`# ${title}`, '', `${sentences.length} sentences of the eval set (M-03).`, '', ...models.map((m) => modelReport(sentences, m))].join('\n')
