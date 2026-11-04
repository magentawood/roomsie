import { isDeepStrictEqual } from 'node:util'
import type { AnalyticsEvent, TurnLabel } from '@roomsie/contract'
import { labelledSlots, languages, type EvalLanguage, type EvalSentence } from './set'

/** One run of one sentence: the filled slots of Form A, and the label of the router. `answered`: the extractor model gave an answer. */
export type TurnResult = { id: string; repeat: number; answered: boolean; values: Record<string, unknown>; label: Pick<TurnLabel, 'register' | 'band' | 'routerBand' | 'danger' | 'community'> }
/** One attempt of a model call, from the event `model_called`, with the sentence. */
export type CallResult = { id: string } & Pick<Extract<AnalyticsEvent, { name: 'model_called' }>, 'role' | 'ms' | 'outcome'>

/** The language of the router for each language of the set: the language of the words that are not English (the spec of T-27). */
const routerLanguages = { english: 'english', hinglish: 'hindi', marathi: 'marathi' } as const satisfies Record<EvalLanguage, string>

/** The script of most of the letters (the spec of T-27). The set marks Devanagari with "1BHK" as `mixed`. */
export function mainScript(text: string) {
  const count = (letters: RegExp) => text.match(letters)?.length ?? 0
  return count(/\p{Script=Devanagari}/gu) > count(/[A-Za-z]/g) ? 'devanagari' : 'latin'
}

const sorted = (value: unknown) => (Array.isArray(value) ? value.toSorted() : value)
const same = (a: unknown, b: unknown) => isDeepStrictEqual(sorted(a), sorted(b))

export const zeroCounts = {
  turns: 0, noAnswer: 0, labelled: 0, right: 0, unclearLabels: 0, unclearRight: 0, vagueFilled: 0, madeUp: 0, extraUnclear: 0,
  languageRight: 0, scriptRight: 0, alarmsAbove: 0, alarmsBelow: 0, falseFlags: 0,
}
export type Counts = typeof zeroCounts

/** A turn with no answer of the extractor counts apart, not as wrong slots: live, the fallback answers it. */
function countsOf(sentence: EvalSentence, { answered, values, label }: TurnResult): Counts {
  const labels = answered ? labelledSlots(sentence.expected) : {}
  const [sure, vague] = [Object.entries(labels).filter(([, v]) => v !== 'unclear'), Object.keys(labels).filter((slot) => labels[slot] === 'unclear')]
  const extra = Object.entries(values).filter(([slot]) => !(slot in labels))
  return {
    turns: 1,
    noAnswer: Number(!answered),
    labelled: sure.length,
    right: sure.filter(([slot, value]) => same(values[slot], value)).length,
    unclearLabels: vague.length,
    unclearRight: vague.filter((slot) => values[slot] === 'unclear').length,
    vagueFilled: vague.filter((slot) => values[slot] !== undefined && values[slot] !== 'unclear').length,
    madeUp: extra.filter(([, value]) => value !== 'unclear').length,
    extraUnclear: extra.filter(([, value]) => value === 'unclear').length,
    languageRight: Number(label.register?.language === routerLanguages[sentence.language]),
    scriptRight: Number(label.register?.script === mainScript(sentence.text)),
    alarmsAbove: Number(label.band !== 'core'),
    alarmsBelow: Number(label.band === 'core' && label.routerBand !== null && label.routerBand !== 'core'),
    falseFlags: Number(label.danger) + Number(label.community),
  }
}

export const sentencesById = (sentences: EvalSentence[]) => new Map(sentences.map((s) => [s.id, s]))

export const groups = ['all', ...languages] as const
export type Group = (typeof groups)[number]

/** The counts of all the turns, and of the turns of each language. Each sentence of the set is a search, with no flag. */
export function scoresOf(sentences: EvalSentence[], turns: TurnResult[]) {
  const byId = sentencesById(sentences)
  const scores = Object.fromEntries(groups.map((group) => [group, { ...zeroCounts }])) as Record<Group, Counts>
  for (const turn of turns) {
    const sentence = byId.get(turn.id)!
    const counts = countsOf(sentence, turn)
    for (const group of [scores.all, scores[sentence.language]]) for (const key of Object.keys(counts) as (keyof Counts)[]) group[key] += counts[key]
  }
  return scores
}

/** Check 6 of PD11: no-go if fewer than 7 in 10 labelled slots are right, or a vague slot gets a value. */
export const goNoGo = (c: Counts) => (c.right >= 0.7 * c.labelled && c.vagueFilled === 0 ? 'go' : 'no-go')

/** The times include the failed attempts, which mostly end at the timeout. Nearest-rank percentiles. */
export function callStats(calls: CallResult[]) {
  const ms = calls.map((c) => c.ms).toSorted((a, b) => a - b)
  const at = (share: number) => ms[Math.ceil(share * ms.length) - 1] ?? null
  return { attempts: calls.length, invalid: calls.filter((c) => c.outcome === 'invalid').length, failed: calls.filter((c) => c.outcome === 'failed').length, medianMs: at(0.5), p95Ms: at(0.95) }
}

/** The sentences whose slots, register or band change between the repeats. */
export function flipsOf(turns: TurnResult[]) {
  const answers = new Map<string, Set<string>>()
  for (const { id, values, label } of turns) answers.set(id, (answers.get(id) ?? new Set()).add(JSON.stringify([values, label.register, label.band])))
  return [...answers].filter(([, seen]) => seen.size > 1).map(([id]) => id)
}

const shown = (value: unknown) => (value === undefined ? 'nothing' : JSON.stringify(value))
const counted = (counts: Map<string, number>, key: string) => counts.set(key, (counts.get(key) ?? 0) + 1)
/**
 * Each wrong slot, as `m02 · moveDate: label "2026-12-31", got nothing (3)`, with the number of repeats that gave it.
 * The slots that are `unclear` with no label make one line for each sentence and number: they are extra questions, not wrong values.
 */
export function missesOf(sentences: EvalSentence[], turns: TurnResult[]) {
  const byId = sentencesById(sentences)
  const misses = new Map<string, number>()
  const extras = new Map<string, Map<string, number>>()
  for (const { id, answered, values } of turns) {
    if (!answered) {
      counted(misses, `${id} · no answer of the extractor`)
      continue
    }
    const labels = labelledSlots(byId.get(id)!.expected)
    for (const slot of new Set([...Object.keys(labels), ...Object.keys(values)])) {
      if (same(values[slot], labels[slot])) continue
      if (labels[slot] === undefined && values[slot] === 'unclear') counted(extras.get(id) ?? extras.set(id, new Map()).get(id)!, slot)
      else counted(misses, `${id} · ${slot}: label ${shown(labels[slot])}, got ${shown(values[slot])}`)
    }
  }
  const extraLines = [...extras].flatMap(([id, slots]) => [...new Set(slots.values())]
    .map((n) => `${id} · \`unclear\` with no label (${n}): ${[...slots].filter(([, count]) => count === n).map(([slot]) => slot).join(', ')}`))
  return [...[...misses].map(([miss, n]) => `${miss} (${n})`), ...extraLines].toSorted()
}
