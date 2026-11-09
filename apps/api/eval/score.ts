import { isDeepStrictEqual } from 'node:util'
import { z } from 'zod'
import { modelRoles, scopeBands, type AnalyticsEvent, type ComposerInput, type ReplyLanguage, type TurnLabel } from '@roomsie/contract'
import { checkFailure, checkFailures, nameFailure, newStartCapitals, type CheckContext, type CheckFailure } from '../src/assistant/handlers/composer/check'
import { isDevanagari } from '../src/assistant/words'
import { isPlainSearch, labelledSlots, languages, type EvalLanguage, type EvalSentence } from './set'

/** The composer call of a turn: its input, its text (null: no answer), the time of all its attempts, and the register of the text by the judge. */
export type ComposerResult = Pick<ComposerInput, 'language' | 'draft' | 'message'> & { text: string | null; ms: number; judgeRegister: TurnLabel['register'] }
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
/** Form A keeps a list of place types, and a label or an older run has one type: a value equals a list of that value. */
const asList = (value: unknown) => (typeof value === 'string' && value !== 'unclear' ? [value] : value)
const same = (a: unknown, b: unknown) => isDeepStrictEqual(sorted(asList(a)), sorted(asList(b)))

export const zeroCounts = {
  turns: 0, searches: 0, noAnswer: 0, routerNoAnswer: 0, labelled: 0, right: 0, unclearLabels: 0, unclearRight: 0, vagueFilled: 0, madeUp: 0, extraUnclear: 0,
  languageRight: 0, scriptRight: 0, alarmsAbove: 0, alarmsBelow: 0, falseFlags: 0,
  otherBands: 0, bandRight: 0, dangers: 0, dangerRight: 0, communities: 0, communityRight: 0,
}
export type Counts = typeof zeroCounts

/**
 * A turn with no answer of a handler counts apart, not as wrong values: live, the fallback answers it.
 * Only a search gets the scores of the extractor. A false alarm is a sentence of the core band in a different band (the spec of T-61).
 */
function countsOf(sentence: EvalSentence, { extractorAnswered, values, label }: TurnResult): Counts {
  const search = isPlainSearch(sentence)
  const labels = search && extractorAnswered ? labelledSlots(sentence.expected) : {}
  const [sure, vague] = [Object.entries(labels).filter(([, v]) => v !== 'unclear'), Object.keys(labels).filter((slot) => labels[slot] === 'unclear')]
  const extra = search ? Object.entries(values).filter(([slot]) => !(slot in labels)) : []
  const otherBand = sentence.band !== 'core'
  // The router gives no band only when it gave no answer (T-34).
  const routed = label.routerBand !== null
  return {
    turns: 1,
    searches: Number(search),
    noAnswer: Number(search && !extractorAnswered),
    routerNoAnswer: Number(!routed),
    labelled: sure.length,
    right: sure.filter(([slot, value]) => same(values[slot], value)).length,
    unclearLabels: vague.length,
    unclearRight: vague.filter((slot) => values[slot] === 'unclear').length,
    vagueFilled: vague.filter((slot) => values[slot] !== undefined && values[slot] !== 'unclear').length,
    madeUp: extra.filter(([, value]) => value !== 'unclear').length,
    extraUnclear: extra.filter(([, value]) => value === 'unclear').length,
    languageRight: Number(label.register?.language === routerLanguages[sentence.language]),
    scriptRight: Number(label.register?.script === mainScript(sentence.text)),
    alarmsAbove: Number(!otherBand && label.band !== 'core'),
    alarmsBelow: Number(!otherBand && label.band === 'core' && routed && label.routerBand !== 'core'),
    // The set has no question about the notes of the person, so each `notes` flag is false.
    falseFlags: Number(label.danger && !sentence.danger) + Number(label.community && !sentence.community) + Number(label.notes),
    otherBands: Number(routed && otherBand),
    bandRight: Number(routed && otherBand && label.band === sentence.band),
    dangers: Number(routed && sentence.danger),
    dangerRight: Number(routed && sentence.danger && label.danger),
    communities: Number(routed && sentence.community),
    communityRight: Number(routed && sentence.community && label.community),
  }
}

export const sentencesById = (sentences: EvalSentence[]) => new Map(sentences.map((s) => [s.id, s]))

/** The groups of the report. The set labels Hindi in Devanagari as Hinglish (M-03), and the report gives it a group of its own (testing.md). */
export const groups = ['all', ...languages, 'hindi'] as const
export type Group = (typeof groups)[number]
export const groupOf = ({ language, script }: Pick<EvalSentence, 'language' | 'script'>): Group => (language === 'hinglish' && script !== 'latin' ? 'hindi' : language)

/** The counts of all the turns, and of the turns of each language. */
export function scoresOf(sentences: EvalSentence[], turns: TurnResult[]) {
  const byId = sentencesById(sentences)
  const scores = Object.fromEntries(groups.map((group) => [group, { ...zeroCounts }])) as Record<Group, Counts>
  for (const turn of turns) {
    const sentence = byId.get(turn.id)!
    const counts = countsOf(sentence, turn)
    for (const group of [scores.all, scores[groupOf(sentence)]]) for (const key of Object.keys(counts) as (keyof Counts)[]) group[key] += counts[key]
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

/**
 * The sentences whose slots, register or band change between the repeats.
 * A turn with no answer of the router, or a search with no answer of the extractor, is not a change.
 */
export function flipsOf(sentences: EvalSentence[], turns: TurnResult[]) {
  const byId = sentencesById(sentences)
  const answers = new Map<string, Set<string>>()
  for (const { id, extractorAnswered, values, label } of turns) {
    const search = isPlainSearch(byId.get(id)!)
    if ((search && !extractorAnswered) || label.routerBand === null) continue
    const answer = JSON.stringify([search ? values : null, label.register, label.band])
    answers.set(id, (answers.get(id) ?? new Set()).add(answer))
  }
  return [...answers].filter(([, seen]) => seen.size > 1).map(([id]) => id)
}

const shown = (value: unknown) => (value === undefined ? 'nothing' : JSON.stringify(value))
export const counted = (counts: Map<string, number>, key: string) => counts.set(key, (counts.get(key) ?? 0) + 1)
/**
 * Each wrong slot, band and flag, and each turn with no answer of the extractor or the router, as `m02 · moveDate: label "2026-12-31", got nothing (3)`, with the number of repeats that gave it.
 * The slots that are `unclear` with no label make one line for each sentence and number: they are extra questions, not wrong values.
 */
export function missesOf(sentences: EvalSentence[], turns: TurnResult[]) {
  const byId = sentencesById(sentences)
  const misses = new Map<string, number>()
  const extras = new Map<string, Map<string, number>>()
  for (const { id, extractorAnswered, values, label } of turns) {
    const sentence = byId.get(id)!
    if (label.routerBand === null) counted(misses, `${id} · no answer of the router`)
    else for (const key of ['band', 'danger', 'community'] as const) if (label[key] !== sentence[key]) counted(misses, `${id} · ${key}: label ${shown(sentence[key])}, got ${shown(label[key])}`)
    if (!isPlainSearch(sentence)) continue
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

export const tieCentre = 0.8
const fromTieCentre = (threshold: number) => Math.round(Math.abs(threshold - tieCentre) * 1000)
/**
 * The router threshold by the rule of T-61: the most danger kept, then the fewest false alarms above the threshold,
 * then the most bands right, then the nearest to 0.8. Of two at the same distance, the rule takes the higher, so the result is one value.
 */
export function selectThreshold(rows: { threshold: number; counts: Counts }[]) {
  return rows.toSorted(({ threshold: t, counts: a }, { threshold: u, counts: b }) =>
    b.dangerRight - a.dangerRight || a.alarmsAbove - b.alarmsAbove || b.bandRight - a.bandRight || fromTieCentre(t) - fromTieCentre(u) || u - t)[0]!.threshold
}

/** The composer of the eval gets no turns and no Form B notes (the spec of T-61). */
const contextOf = ({ draft, message }: ComposerResult): CheckContext => ({ draft, message, turns: [], formB: [] })
export const failureOf = (call: ComposerResult) => (call.text === null ? null : checkFailure(call.text, contextOf(call)))
/**
 * The name of the friend that a text holds, in either script. The names of the set are in lower case.
 * A part of a word matches, because Marathi and Hindi join an ending to a name, as "प्रियासोबत".
 */
export const nameIn = (text: string, names: string[]) => names.find((name) => text.toLowerCase().includes(name))
/** The register of the router for each reply language: the reverse of `languageOf` in the lines of the assistant. */
const judgeRegisters = {
  en: { language: 'english', script: 'latin' }, 'hi-Latn': { language: 'hindi', script: 'latin' }, hi: { language: 'hindi', script: 'devanagari' },
  'mr-Latn': { language: 'marathi', script: 'latin' }, mr: { language: 'marathi', script: 'devanagari' },
} as const satisfies Record<ReplyLanguage, NonNullable<TurnLabel['register']>>
/** The language of the judge and the script of the letters, against the reply language that the composer got. */
export const registerRight = (text: string, { judgeRegister, language }: ComposerResult) => ({
  languageRight: judgeRegister?.language === judgeRegisters[language].language,
  scriptRight: mainScript(text) === judgeRegisters[language].script,
})

export const zeroComposer = () => ({
  calls: 0, noAnswer: 0, judged: 0, languageRight: 0, scriptRight: 0, english: 0, failed: 0,
  ...(Object.fromEntries(checkFailures.map((reason) => [reason, 0])) as Record<CheckFailure, number>),
})
export type ComposerCounts = ReturnType<typeof zeroComposer>

/** The scores of the composer against the reply language that it got: each handler gets its own score (PD7a). */
export function composerScoresOf(searches: ReturnType<typeof composersOfPlainSearches>) {
  const scores = Object.fromEntries(groups.map((group) => [group, zeroComposer()])) as Record<Group, ComposerCounts>
  for (const { sentence, composer } of searches) {
    const { text, judgeRegister, language } = composer
    const failure = failureOf(composer)
    for (const group of [scores.all, scores[groupOf(sentence)]]) {
      group.calls += 1
      if (text === null) {
        group.noAnswer += 1
        continue
      }
      const { languageRight, scriptRight } = registerRight(text, composer)
      group.judged += Number(judgeRegister !== null)
      group.languageRight += Number(languageRight)
      group.scriptRight += Number(scriptRight)
      group.english += Number(language !== 'en' && judgeRegister?.language === 'english')
      if (failure) {
        group.failed += 1
        group[failure] += 1
      }
    }
  }
  return scores
}

/**
 * The texts with the name of the friend of a sentence (T-61): stopped by the name rules of the check, or missed by them, with the limit.
 * The rules see no name in Devanagari, in the text or in the message, and no name that the person typed in lower case.
 * Of the names that the rules miss, a different rule of the check can still stop the text.
 */
export function namesOf(sentences: EvalSentence[], turns: TurnResult[]) {
  return sentences.filter((s) => s.names.length > 0).map(({ id, text: said, names }) => {
    const counts = { id, replies: 0, withName: 0, stopped: 0, lowerCase: 0, devanagari: 0, other: 0, stoppedByOtherRule: 0 }
    // The names are in lower case, so a match with the case of the message is a name that the person typed in lower case.
    const typed = names.find((name) => said.includes(name))
    const calls = turns.flatMap(({ id: of, composer }) => (of === id && composer?.text ? [{ call: composer, text: composer.text }] : []))
    for (const { call, text } of calls) {
      counts.replies += 1
      const name = nameIn(text, names)
      if (!name) continue
      counts.withName += 1
      if (nameFailure(text, contextOf(call))) {
        counts.stopped += 1
        continue
      }
      if (isDevanagari(name) || (typed && isDevanagari(typed))) counts.devanagari += 1
      else if (typed) counts.lowerCase += 1
      else counts.other += 1
      if (failureOf(call)) counts.stoppedByOtherRule += 1
    }
    return counts
  })
}

/** The scores of the turns of each band that is not core: each band gets its own score (the spec of T-61). */
export function bandScoresOf(sentences: EvalSentence[], turns: TurnResult[]) {
  const byId = sentencesById(sentences)
  return scopeBands.filter((band) => band !== 'core').map((band) => ({ band, scores: scoresOf(sentences, turns.filter((t) => byId.get(t.id)!.band === band)) }))
}

/** Each composer call of a search, with its sentence. A sentence of the other bands reaches the composer only when its band is not sure (T-61). */
export function composersOfPlainSearches(sentences: EvalSentence[], turns: TurnResult[]) {
  const byId = sentencesById(sentences)
  return turns.flatMap(({ id, composer }) => {
    const sentence = byId.get(id)!
    return composer && isPlainSearch(sentence) ? [{ sentence, composer }] : []
  })
}

/** For a person to read: a name that the composer makes up passes at the start of a sentence (the first limit of the name check). */
export function startCapitalsOf(calls: ComposerResult[]) {
  const words = new Map<string, number>()
  for (const call of calls) if (call.text && !failureOf(call)) for (const word of newStartCapitals(call.text, call)) counted(words, word)
  return [...words].toSorted(([a, m], [b, n]) => n - m || a.localeCompare(b))
}

export const deadlineSteps = [1500, 2000, 2500, 3000, 3500, 4000]
/** A call with no answer is late. */
export const inTimeAt = (calls: ComposerResult[], step: number) => calls.filter((c) => c.text !== null && c.ms <= step).length
/** The deadline by the rule of T-61: the smallest step where 9 of 10 composer calls answer in time, and at most the last step. */
export const selectDeadline = (calls: ComposerResult[]) =>
  calls.length ? (deadlineSteps.find((step) => inTimeAt(calls, step) >= 0.9 * calls.length) ?? deadlineSteps.at(-1)!) : null
