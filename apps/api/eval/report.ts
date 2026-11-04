import { callStats, flipsOf, goNoGo, groups, missesOf, scoresOf, sentencesById, type CallResult, type Counts, type Group, type TurnResult } from './score'
import type { EvalSentence } from './set'

/** The scores of one model at each threshold of the sweep. `live` is the threshold of the settings. */
export type ModelScores = { model: string; live: number; sweep: { threshold: number; turns: TurnResult[] }[]; calls: CallResult[]; repeats: number }

const share = (part: number, whole: number) => (whole ? `${Math.round((100 * part) / whole)}% (${part}/${whole})` : '—')
/** A count as the mean of one repeat (the spec of T-27). */
const mean = (count: number, repeats: number) => String(Math.round((10 * count) / repeats) / 10)
type Row = [string, (c: Counts, repeats: number) => string]
/** The rows of the extractor that the threshold changes: the rows of the sweep. */
const sweepRows: Row[] = [
  ['Labelled slots right', (c) => share(c.right, c.labelled)],
  ['Made-up values', (c, r) => mean(c.madeUp, r)],
  ['Vague slots marked unclear', (c) => share(c.unclearRight, c.unclearLabels)],
  ['Vague slots with a value', (c, r) => mean(c.vagueFilled, r)],
]
const rows: Row[] = [
  ['Turns with no answer of the extractor', (c) => share(c.noAnswer, c.turns)],
  ...sweepRows,
  ['Unclear in a slot with no label', (c, r) => mean(c.extraUnclear, r)],
  ['Router language right', (c) => share(c.languageRight, c.turns)],
  ['Router main script right', (c) => share(c.scriptRight, c.turns)],
  ['False alarms, above / below the threshold', (c, r) => `${mean(c.alarmsAbove, r)} / ${mean(c.alarmsBelow, r)}`],
  ['False flags', (c, r) => mean(c.falseFlags, r)],
]

/** The thresholds in a row with the same scores make one line of the sweep. */
export const rangesOf = (lines: { threshold: number; cells: string }[]) => lines.reduce<{ from: number; to: number; cells: string }[]>((ranges, { threshold, cells }) => {
  const last = ranges.at(-1)
  if (last?.cells === cells) last.to = threshold
  else ranges.push({ from: threshold, to: threshold, cells })
  return ranges
}, [])

function modelReport(sentences: EvalSentence[], { model, live, sweep, calls, repeats }: ModelScores) {
  const turns = sweep.find((s) => s.threshold === live)!.turns
  const scores = scoresOf(sentences, turns)
  const byId = sentencesById(sentences)
  const callsOf = (group: Group, role?: CallResult['role']) => callStats(calls.filter((c) => (group === 'all' || byId.get(c.id)?.language === group) && (!role || c.role === role)))
  const callRows = [
    `| Output not valid / failed, of the attempts | ${groups.map((g) => { const c = callsOf(g); return `${c.invalid} / ${c.failed} of ${c.attempts}` }).join(' | ')} |`,
    ...([['Extractor', 'extractor'], ['Router', 'router']] as const).map(([name, role]) => `| ${name} time, median / 95th percentile | ${groups.map((g) => { const c = callsOf(g, role); return `${c.medianMs ?? '—'} / ${c.p95Ms ?? '—'} ms` }).join(' | ')} |`),
  ]
  return [
    `## ${model}`, '',
    `At the threshold ${live}, ${repeats} repeats of each sentence. A share is of all the repeats, and a count is the mean of one repeat. Check 6 of PD11: **${goNoGo(scores.all)}**.`, '',
    '| | All | English | Hinglish | Marathi |', '|---|---|---|---|---|',
    ...rows.map(([name, cell]) => `| ${name} | ${groups.map((g) => cell(scores[g], repeats)).join(' | ')} |`), ...callRows, '',
    '### The threshold sweep', '', 'The recorded answers again, through the extractor at each threshold, with no new call.', '',
    `| Threshold | ${sweepRows.map(([name]) => name).join(' | ')} | PD11 |`, `|---|${sweepRows.map(() => '---|').join('')}---|`,
    ...rangesOf(sweep.map(({ threshold, turns }) => {
      const c = scoresOf(sentences, turns).all
      return { threshold, cells: `${sweepRows.map(([, cell]) => cell(c, repeats)).join(' | ')} | ${goNoGo(c)}` }
    })).map(({ from, to, cells }) => `| ${from === to ? from : `${from} to ${to}`}${from <= live && live <= to ? ` (live: ${live})` : ''} | ${cells} |`), '',
    '### The misses', '',
    ...missesOf(sentences, turns).map((miss) => `- ${miss}`), '',
    `**Answers that change between the repeats:** ${flipsOf(turns).join(', ') || 'none'}.`, '',
  ].join('\n')
}

export const reportOf = (title: string, sentences: EvalSentence[], models: ModelScores[]) =>
  [`# ${title}`, '', `${sentences.length} sentences of the eval set (M-03).`, '', ...models.map((m) => modelReport(sentences, m))].join('\n')
