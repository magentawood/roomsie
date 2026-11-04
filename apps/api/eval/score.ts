import { isDeepStrictEqual } from 'node:util'
import { z } from 'zod'
import { modelRoles, type AnalyticsEvent, type ComposerInput, type ReplyLanguage, type TurnLabel } from '@roomsie/contract'
import { checkFailure, checkFailures, newStartCapitals } from '../src/assistant/handlers/composer/check'
import { isDevanagari } from '../src/assistant/words'
import { isSearch, labelledSlots, languages, type EvalLanguage, type EvalSentence } from './set'

/** The composer call of a turn: its input, its text (null: no answer), the time of all its attempts, and the register of the text. */
export type ComposerResult = Pick<ComposerInput, 'language' | 'draft' | 'message'> & { text: string | null; ms: number; judge: TurnLabel['register'] }
/** One run of one sentence: the filled slots of Form A, the label of the router, and the composer call, if the turn had one. */
export type TurnResult = {
  id: string; repeat: number; extractorAnswered: boolean; values: Record<string, unknown>
  label: Pick<TurnLabel, 'register' | 'band' | 'routerBand' | 'danger' | 'community' | 'notes'>
  composer?: ComposerResult
}
const outcomes = ['ok', 'invalid', 'failed'] as const satisfies readonly Extract<AnalyticsEvent, { name: 'model_called' }>['outcome'][]
/** One attempt of a model call, from the event `model_called`, with the sentence. */
export const callResult = z.strictObject({ id: z.string(), role: z.enum(modelRoles), ms: z.number(), outcome: z.enum(outcomes) })
export type CallResult = z.infer<typeof callResult>

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
  turns: 0, searches: 0, noAnswer: 0, routerNoAnswer: 0, labelled: 0, right: 0, unclearLabels: 0, unclearRight: 0, vagueFilled: 0, madeUp: 0, extraUnclear: 0,
  languageRight: 0, scriptRight: 0, alarmsAbove: 0, alarmsBelow: 0, falseFlags: 0,
  otherBands: 0, bandRight: 0, dangers: 0, dangerRight: 0, communities: 0, communityRight: 0,
}
export type Counts = typeof zeroCounts

/**
 * A turn with no answer of a handler counts apart, not as wrong values: live, the fallback answers it.
 * Only a search gets the scores of the extractor and the false alarms (the spec of T-61).
 */
function countsOf(sentence: EvalSentence, { extractorAnswered, values, label }: TurnResult): Counts {
  const search = isSearch(sentence)
  const labels = search && extractorAnswered ? labelledSlots(sentence.expected) : {}
  const [sure, vague] = [Object.entries(labels).filter(([, v]) => v !== 'unclear'), Object.keys(labels).filter((slot) => labels[slot] === 'unclear')]
  const extra = search ? Object.entries(values).filter(([slot]) => !(slot in labels)) : []
  const otherBand = sentence.band !== 'core'
  return {
    turns: 1,
    searches: Number(search),
    noAnswer: Number(search && !extractorAnswered),
    // The router gives no band only when it gave no answer (T-34).
    routerNoAnswer: Number(label.routerBand === null),
    labelled: sure.length,
    right: sure.filter(([slot, value]) => same(values[slot], value)).length,
    unclearLabels: vague.length,
    unclearRight: vague.filter((slot) => values[slot] === 'unclear').length,
    vagueFilled: vague.filter((slot) => values[slot] !== undefined && values[slot] !== 'unclear').length,
    madeUp: extra.filter(([, value]) => value !== 'unclear').length,
    extraUnclear: extra.filter(([, value]) => value === 'unclear').length,
    languageRight: Number(label.register?.language === routerLanguages[sentence.language]),
    scriptRight: Number(label.register?.script === mainScript(sentence.text)),
    alarmsAbove: Number(search && label.band !== 'core'),
    alarmsBelow: Number(search && label.band === 'core' && label.routerBand !== null && label.routerBand !== 'core'),
    // The set has no question about the notes of the person, so each `notes` flag is false.
    falseFlags: Number(label.danger && !sentence.danger) + Number(label.community && !sentence.community) + Number(label.notes),
    otherBands: Number(otherBand),
    bandRight: Number(otherBand && label.band === sentence.band),
    dangers: Number(sentence.danger),
    dangerRight: Number(sentence.danger && label.danger),
    communities: Number(sentence.community),
    communityRight: Number(sentence.community && label.community),
  }
}

export const sentencesById = (sentences: EvalSentence[]) => new Map(sentences.map((s) => [s.id, s]))

export const groups = ['all', ...languages] as const
export type Group = (typeof groups)[number]

/** The counts of all the turns, and of the turns of each language. */
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
export function callStats(calls: Pick<CallResult, 'ms' | 'outcome'>[]) {
  const ms = calls.map((c) => c.ms).toSorted((a, b) => a - b)
  const at = (share: number) => ms[Math.ceil(share * ms.length) - 1] ?? null
  return { attempts: calls.length, invalid: calls.filter((c) => c.outcome === 'invalid').length, failed: calls.filter((c) => c.outcome === 'failed').length, medianMs: at(0.5), p95Ms: at(0.95) }
}

/** The sentences whose slots, register or band change between the repeats. A turn with no answer is not a change. */
export function flipsOf(turns: TurnResult[]) {
  const answers = new Map<string, Set<string>>()
  for (const { id, values, label } of turns.filter((t) => t.extractorAnswered)) answers.set(id, (answers.get(id) ?? new Set()).add(JSON.stringify([values, label.register, label.band])))
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
  for (const { id, extractorAnswered, values, label } of turns) {
    const sentence = byId.get(id)!
    for (const key of ['band', 'danger', 'community'] as const) if (label[key] !== sentence[key]) counted(misses, `${id} · ${key}: label ${shown(sentence[key])}, got ${shown(label[key])}`)
    if (!isSearch(sentence)) continue
    if (!extractorAnswered) {
      counted(misses, `${id} · no answer of the extractor`)
      continue
    }
    const labels = labelledSlots(sentence.expected)
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

const fromLiveValue = (threshold: number) => Math.round(Math.abs(threshold - 0.8) * 1000)
/**
 * The router threshold by the rule of T-61: the most danger kept, then the fewest false alarms above the threshold,
 * then the most bands right, then the nearest to 0.8. Of two at the same distance, the higher gives fewer false alarms.
 */
export function selectThreshold(rows: { threshold: number; counts: Counts }[]) {
  return rows.toSorted(({ threshold: t, counts: a }, { threshold: u, counts: b }) =>
    b.dangerRight - a.dangerRight || a.alarmsAbove - b.alarmsAbove || b.bandRight - a.bandRight || fromLiveValue(t) - fromLiveValue(u) || u - t)[0]?.threshold ?? null
}

const failureOf = ({ text, draft, message }: ComposerResult) => (text === null ? null : checkFailure(text, { draft, message, turns: [], formB: [] }))
/** The language of the router for each reply language, and the scripts of the reply languages in Devanagari. */
const judgeLanguages = { en: 'english', 'hi-Latn': 'hindi', hi: 'hindi', 'mr-Latn': 'marathi', mr: 'marathi' } as const satisfies Record<ReplyLanguage, string>
const devanagariLanguages: ReplyLanguage[] = ['hi', 'mr']

export const zeroComposer = () => ({
  calls: 0, noAnswer: 0, judged: 0, languageRight: 0, scriptRight: 0, english: 0, failed: 0,
  ...(Object.fromEntries(checkFailures.map((reason) => [reason, 0])) as Record<(typeof checkFailures)[number], number>),
})
export type ComposerCounts = ReturnType<typeof zeroComposer>

/** The scores of the composer against the reply language that it got: each handler gets its own score (PD7a). */
export function composerScoresOf(sentences: EvalSentence[], turns: TurnResult[]) {
  const byId = sentencesById(sentences)
  const scores = Object.fromEntries(groups.map((group) => [group, zeroComposer()])) as Record<Group, ComposerCounts>
  for (const { id, composer } of turns) {
    if (!composer) continue
    const { text, judge, language } = composer
    const failure = failureOf(composer)
    const add = (group: ComposerCounts) => {
      group.calls += 1
      if (text === null) return void (group.noAnswer += 1)
      group.judged += Number(judge !== null)
      group.languageRight += Number(judge?.language === judgeLanguages[language])
      group.scriptRight += Number(mainScript(text) === (devanagariLanguages.includes(language) ? 'devanagari' : 'latin'))
      group.english += Number(language !== 'en' && judge?.language === 'english')
      if (failure) group.failed += 1
      if (failure) group[failure] += 1
    }
    add(scores.all)
    add(scores[byId.get(id)!.language])
  }
  return scores
}

/** The texts with the name of the friend of a sentence: stopped by the check, or through by a limit of the check (T-61). */
export function namesOf(sentences: EvalSentence[], turns: TurnResult[]) {
  return sentences.filter((s) => s.names.length > 0).map(({ id, text: said, names }) => {
    const counts = { id, replies: 0, withName: 0, stopped: 0, lowerCase: 0, devanagari: 0, other: 0 }
    // The names are in lower case, so a match with the case of the message is a name that the person typed in lower case.
    const typedInLowerCase = names.some((name) => !isDevanagari(name) && said.includes(name))
    for (const { composer } of turns.filter((t) => t.id === id && t.composer?.text)) {
      counts.replies += 1
      const name = names.find((n) => composer!.text!.toLowerCase().includes(n))
      if (!name) continue
      counts.withName += 1
      if (failureOf(composer!)) counts.stopped += 1
      else if (isDevanagari(name)) counts.devanagari += 1
      else if (typedInLowerCase) counts.lowerCase += 1
      else counts.other += 1
    }
    return counts
  })
}

/** For a person to read: a name that the composer makes up passes at the start of a sentence (the first limit of the name check). */
export function startCapitalsOf(turns: TurnResult[]) {
  const words = new Map<string, number>()
  for (const { composer } of turns) if (composer?.text && !failureOf(composer)) for (const word of newStartCapitals(composer.text, composer)) counted(words, word)
  return [...words].toSorted(([a, m], [b, n]) => n - m || a.localeCompare(b))
}

export const deadlineSteps = [1500, 2000, 2500, 3000, 3500, 4000]
/** A call with no answer is late. */
export const inTimeAt = (calls: ComposerResult[], step: number) => calls.filter((c) => c.text !== null && c.ms <= step).length
/** The deadline by the rule of T-61: the smallest step where 9 of 10 composer calls answer in time, and at most the last step. */
export const selectDeadline = (calls: ComposerResult[]) =>
  calls.length ? (deadlineSteps.find((step) => inTimeAt(calls, step) >= 0.9 * calls.length) ?? deadlineSteps.at(-1)!) : null
