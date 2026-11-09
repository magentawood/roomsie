import type { ComposerInput } from '@roomsie/contract'
import { maskContacts } from '../../../text/mask-contacts'
import { plainWords } from '../../words'
import { wordAmountsIn } from '../extractor/budget-words'

/** Words that a reply can write with a capital letter in any place: they are not names. */
const alwaysCapital = new Set(['roomsie', 'mumbai', 'pg', 'bhk', 'ok'])
const isPronounI = (word: string) => /^i(?:['’](?:m|ve|ll|d))?$/i.test(word)
const email = /\S+@\S+\.\S+/
const link = /https?:\/\/|www\.|\b[\w-]+\.(?:com|in|org|net|co|io|me|app)\b/i
/** A phone number, an email address or a link: no generated text has one (PD17). The advisor uses it too. */
export const hasContact = (text: string) => maskContacts(text) !== text || email.test(text) || link.test(text)

const numbersIn = (text: string) => [...(plainWords(text).match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replaceAll(',', ''))), ...wordAmountsIn(text)]
const wordsIn = (text: string) => text.split(/\s+/).map((word) => word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')).filter(Boolean)
const isCapital = (word: string) => /^\p{Lu}/u.test(word)

const sentencesIn = (text: string) => text.split(/(?<=[.!?।])\s+/).map(wordsIn)

/** Capital words not at the start of a sentence. Devanagari has no capitals, so only Latin script gets this check. */
const capitalsInside = (text: string) => sentencesIn(text).flatMap((words) => words.slice(1).filter(isCapital))

/** The capital words at the start of a sentence that are not in the plan or the message: the first limit of the name check. */
export function newStartCapitals(text: string, { draft, message }: Pick<ComposerInput, 'draft' | 'message'>) {
  const known = new Set([...wordsIn(`${draft} ${message}`).map((w) => w.toLowerCase()), ...alwaysCapital])
  return sentencesIn(text).map((words) => words[0]).filter((w): w is string => !!w && isCapital(w) && !known.has(w.toLowerCase()) && !isPronounI(w))
}

export const checkFailures = ['too_long', 'no_question', 'contact', 'new_number', 'their_name', 'new_capital'] as const
export type CheckFailure = (typeof checkFailures)[number]
export type CheckContext = Pick<ComposerInput, 'draft' | 'message' | 'turns' | 'formB'>

/**
 * The output check of the composer (T-13). Null: the text passes. A plan with a question needs a question in the text.
 * A name from the words of the person fails too, also at the start of a sentence.
 */
export function checkFailure(text: string, context: CheckContext): CheckFailure | null {
  const { draft, message } = context
  // A reply in Hinglish, Hindi or Marathi runs longer than the English plan.
  if (text.length > Math.max(300, draft.length * 2)) return 'too_long'
  if (draft.includes('?') && !text.includes('?')) return 'no_question'
  if (hasContact(text)) return 'contact'

  // "₹20,000" in the draft lets "20k" and "20 hazaar" through, and "₹1,50,000" lets "1.5 lakh" through.
  const planNumbers = new Set(numbersIn(`${draft} ${message}`).flatMap((n) => [n, n / 1000, n / 100_000]))
  if (numbersIn(text).some((n) => !planNumbers.has(n))) return 'new_number'

  return nameFailure(text, context)
}

/** The name rules of the check alone. The eval asks them also of a text that fails a different rule first (T-61). */
export function nameFailure(text: string, { draft, message, turns, formB }: CheckContext) {
  const planWords = new Set([...wordsIn(draft).map((w) => w.toLowerCase()), ...alwaysCapital])
  const inPlan = (word: string) => planWords.has(word.toLowerCase()) || isPronounI(word)
  const said = [message, ...turns.filter(({ role }) => role === 'user').map(({ text: t }) => t), ...formB.map(({ value }) => value)]
  const theirNames = new Set(said.flatMap(wordsIn).filter((w) => isCapital(w) && !inPlan(w)).map((w) => w.toLowerCase()))
  if (wordsIn(text).some((w) => theirNames.has(w.toLowerCase()))) return 'their_name'
  return capitalsInside(text).every(inPlan) ? null : 'new_capital'
}
