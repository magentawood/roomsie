import { checkFailures } from '../src/assistant/handlers/composer/check'
import {
  callStats, composerScoresOf, deadlineSteps, flipsOf, goNoGo, groups, inTimeAt, missesOf, namesOf, scoresOf, selectDeadline, selectThreshold, sentencesById, startCapitalsOf,
  type CallResult, type ComposerResult, type Counts, type Group, type TurnResult,
} from './score'
import type { EvalSentence } from './set'

/**
 * The scores of one model at each threshold of the sweep: the extractor and the router run again at each threshold.
 * `live` and `routerLive` are the thresholds of the settings.
 */
export type ModelScores = { model: string; live: number; routerLive: number; sweep: { threshold: number; turns: TurnResult[] }[]; calls: CallResult[]; repeats: number }

const share = (part: number, whole: number) => (whole ? `${Math.round((100 * part) / whole)}% (${part}/${whole})` : '—')
/** A count as the mean of one repeat (the spec of T-27). */
export const mean = (count: number, repeats: number) => String(Math.round((10 * count) / repeats) / 10)
type Row = [string, (c: Counts, repeats: number) => string]
/** The rows of the extractor that the threshold changes: the rows of the sweep. */
const sweepRows: Row[] = [
  ['Labelled slots right', (c) => share(c.right, c.labelled)],
  ['Made-up values', (c, r) => mean(c.madeUp, r)],
  ['Vague slots marked unclear', (c) => share(c.unclearRight, c.unclearLabels)],
  ['Vague slots with a value', (c, r) => mean(c.vagueFilled, r)],
]
const rows: Row[] = [
  ['Turns with no answer of the extractor, of the searches', (c) => share(c.noAnswer, c.searches)],
  ['Turns with no answer of the router', (c) => share(c.routerNoAnswer, c.turns)],
  ...sweepRows,
  ['Unclear in a slot with no label', (c, r) => mean(c.extraUnclear, r)],
  ['Router language right', (c) => share(c.languageRight, c.turns - c.routerNoAnswer)],
  ['Router main script right', (c) => share(c.scriptRight, c.turns - c.routerNoAnswer)],
  ['False alarms of a search, above / below the threshold', (c, r) => `${mean(c.alarmsAbove, r)} / ${mean(c.alarmsBelow, r)}`],
  ['False flags', (c, r) => mean(c.falseFlags, r)],
  ['Other bands right', (c) => share(c.bandRight, c.otherBands)],
  ['Danger kept', (c) => share(c.dangerRight, c.dangers)],
  ['Community kept', (c) => share(c.communityRight, c.communities)],
]
/** The rows of the router that its threshold changes (T-61). */
const routerSweepRows: Row[] = [
  ['Danger kept', (c) => share(c.dangerRight, c.dangers)],
  ['False alarms above the threshold', (c, r) => mean(c.alarmsAbove, r)],
  ['Other bands right', (c) => share(c.bandRight, c.otherBands)],
]
type ComposerRow = [string, (c: ReturnType<typeof composerScoresOf>[Group]) => string]
const composerRows: ComposerRow[] = [
  ['Calls with no answer', (c) => share(c.noAnswer, c.calls)],
  ['Language right, of the texts that the router judged', (c) => share(c.languageRight, c.judged)],
  ['Main script right', (c) => share(c.scriptRight, c.calls - c.noAnswer)],
  ['English for a different reply language', (c) => share(c.english, c.judged)],
  ['Texts that fail the output check', (c) => share(c.failed, c.calls - c.noAnswer)],
  ...checkFailures.map((reason): ComposerRow => [`· ${reason}`, (c) => String(c[reason])]),
]

/** The thresholds in a row with the same scores make one line of the sweep. */
export const rangesOf = (lines: { threshold: number; cells: string }[]) => lines.reduce<{ from: number; to: number; cells: string }[]>((ranges, { threshold, cells }) => {
  const last = ranges.at(-1)
  if (last?.cells === cells) last.to = threshold
  else ranges.push({ from: threshold, to: threshold, cells })
  return ranges
}, [])

/** One line for each range of thresholds with the same cells, with the marks of the live and of the selected threshold. */
function sweepLines(lines: { threshold: number; cells: string }[], marks: { live: number; selected?: number | null }) {
  const has = (value: number | null | undefined, from: number, to: number) => value != null && from <= value && value <= to
  return rangesOf(lines).map(({ from, to, cells }) =>
    `| ${from === to ? from : `${from} to ${to}`}${has(marks.live, from, to) ? ` (live: ${marks.live})` : ''}${has(marks.selected, from, to) ? ` (selected: ${marks.selected})` : ''} | ${cells} |`)
}

const quoted = (text: string) => `"${text.replaceAll('\n', ' ')}"`
/** The texts for a person to read: a wrong language or script, a failed check, or the name of the friend. */
function repliesToRead(sentences: EvalSentence[], turns: TurnResult[]) {
  const byId = sentencesById(sentences)
  const lines = new Map<string, number>()
  for (const turn of turns) {
    const c = turn.composer
    if (!c?.text) continue
    // The scores of one text, so the rules of the scores decide what is wrong.
    const one = composerScoresOf(sentences, [turn]).all
    const failure = checkFailures.find((reason) => one[reason] > 0)
    const name = byId.get(turn.id)!.names.some((n) => c.text!.toLowerCase().includes(n))
    if (one.languageRight && one.scriptRight && !failure && !name) continue
    const judge = c.judge ? `the router hears ${c.judge.language}, ${c.judge.script} letters` : 'no answer of the judge'
    const key = `${turn.id} · ${c.language} · ${judge}${failure ? ` · check: ${failure}` : ''}${name ? ' · the name' : ''}: ${quoted(c.text)}`
    lines.set(key, (lines.get(key) ?? 0) + 1)
  }
  return [...lines].map(([line, n]) => `${line} (${n})`).toSorted()
}

function composerReport(sentences: EvalSentence[], turns: TurnResult[]) {
  const composers = turns.flatMap((t) => (t.composer ? [t.composer] : []))
  const scores = composerScoresOf(sentences, turns)
  const time = callStats(composers.map((c: ComposerResult) => ({ ms: Math.round(c.ms), outcome: c.text === null ? 'failed' : 'ok' })))
  const names = namesOf(sentences, turns)
  const capitals = startCapitalsOf(turns)
  const deadline = selectDeadline(composers)
  return [
    '### The composer', '',
    `${composers.length} calls, with no deadline: the timeout of the model module is the only limit. The router judges the language of each text, and code counts the letters. A score is against the reply language that the composer got.`, '',
    '| | All | English | Hinglish | Marathi |', '|---|---|---|---|---|',
    ...composerRows.map(([name, cell]) => `| ${name} | ${groups.map((g) => cell(scores[g])).join(' | ')} |`),
    `| Time of a call, all its attempts, median / 95th percentile | ${time.medianMs ?? '—'} / ${time.p95Ms ?? '—'} ms | | | |`, '',
    '#### The deadline', '',
    `A call with no answer is late. The rule of T-61 selects **${deadline ?? '—'} ms**: the smallest step where 9 of 10 calls answer in time, at most ${deadlineSteps.at(-1)} ms.`, '',
    '| Deadline | Calls in time |', '|---|---|',
    ...deadlineSteps.map((step) => `| ${step} ms | ${share(inTimeAt(composers, step), composers.length)} |`), '',
    '#### The names of a friend', '',
    'A name passes the check when the person typed it in lower case, or in Devanagari.', '',
    '| Sentence | Texts | With the name | Stopped by the check | Through: lower case | Through: Devanagari | Through: other |', '|---|---|---|---|---|---|---|',
    ...names.map((n) => `| ${n.id} | ${n.replies} | ${n.withName} | ${n.stopped} | ${n.lowerCase} | ${n.devanagari} | ${n.other} |`), '',
    `**The capital words at the start of a sentence that are not in the plan or the message** (a made-up name passes there): ${capitals.map(([word, n]) => `${word} (${n})`).join(', ') || 'none'}.`, '',
    '#### The texts to read', '',
    'A wrong language or script, a failed check, or the name of the friend.', '',
    ...(repliesToRead(sentences, turns).map((line) => `- ${line}`).join('\n') || '- none').split('\n'), '',
  ]
}

function modelReport(sentences: EvalSentence[], { model, live, routerLive, sweep, calls, repeats }: ModelScores) {
  const at = (threshold: number) => sweep.find((s) => s.threshold === threshold)!.turns
  // The values of the extractor at its threshold, and the labels of the router at its threshold: both lists keep the order of the run.
  const routerTurns = at(routerLive)
  const turns = at(live).map((turn, i) => ({ ...turn, label: routerTurns[i]!.label }))
  const scores = scoresOf(sentences, turns)
  const routerRows = sweep.map(({ threshold, turns: at }) => ({ threshold, counts: scoresOf(sentences, at).all }))
  const routerSelected = selectThreshold(routerRows)
  const byId = sentencesById(sentences)
  const callsOf = (group: Group, role?: CallResult['role']) => callStats(calls.filter((c) => (group === 'all' || byId.get(c.id)?.language === group) && (!role || c.role === role)))
  const callRows = [
    `| Output not valid / failed, of the attempts | ${groups.map((g) => { const c = callsOf(g); return `${c.invalid} / ${c.failed} of ${c.attempts}` }).join(' | ')} |`,
    ...([['Extractor', 'extractor'], ['Router', 'router'], ['Composer', 'composer']] as const).map(([name, role]) => `| ${name} time, median / 95th percentile | ${groups.map((g) => { const c = callsOf(g, role); return `${c.medianMs ?? '—'} / ${c.p95Ms ?? '—'} ms` }).join(' | ')} |`),
  ]
  return [
    `## ${model}`, '',
    `At the threshold ${live} of the extractor and ${routerLive} of the router, ${repeats} repeats of each sentence. A share is of all the repeats, a count of turns is the mean of one repeat, and a count of attempts is of all the attempts. Check 6 of PD11: **${goNoGo(scores.all)}**.`, '',
    '| | All | English | Hinglish | Marathi |', '|---|---|---|---|---|',
    ...rows.map(([name, cell]) => `| ${name} | ${groups.map((g) => cell(scores[g], repeats)).join(' | ')} |`), ...callRows, '',
    '### The threshold sweep', '', 'The recorded answers again, through the extractor at each threshold, with no new call.', '',
    `| Threshold | ${sweepRows.map(([name]) => name).join(' | ')} | PD11 |`, `|---|${sweepRows.map(() => '---|').join('')}---|`,
    ...sweepLines(sweep.map(({ threshold, turns: at }) => {
      const c = scoresOf(sentences, at).all
      return { threshold, cells: `${sweepRows.map(([, cell]) => cell(c, repeats)).join(' | ')} | ${goNoGo(c)}` }
    }), { live }), '',
    '### The threshold sweep of the router', '',
    `The recorded answers of the router again, at each threshold. The rule of T-61 selects **${routerSelected}**: the most danger kept, then the fewest false alarms, then the most bands right, then the nearest to 0.8. Gemini gives no token probabilities, so its rows do not change.`, '',
    `| Threshold | ${routerSweepRows.map(([name]) => name).join(' | ')} |`, `|---|${routerSweepRows.map(() => '---|').join('')}`,
    ...sweepLines(routerRows.map(({ threshold, counts }) => ({ threshold, cells: routerSweepRows.map(([, cell]) => cell(counts, repeats)).join(' | ') })), { live: routerLive, selected: routerSelected }), '',
    ...composerReport(sentences, turns),
    '### The misses', '',
    ...missesOf(sentences, turns).map((miss) => `- ${miss}`), '',
    `**Answers that change between the repeats:** ${flipsOf(sentences, turns).join(', ') || 'none'}.`, '',
  ].join('\n')
}

export const reportOf = (title: string, sentences: EvalSentence[], models: ModelScores[]) =>
  [`# ${title}`, '', `${sentences.length} sentences of the eval set (M-03 and T-61).`, '', ...models.map((m) => modelReport(sentences, m))].join('\n')
