import type { ComposerInput } from '@roomsie/contract'
import { maskContacts } from '../../../text/mask-contacts'
import { plainWords } from '../../words'

// A reply in Hinglish, Hindi or Marathi runs longer than the English plan.
const capFloor = 300
const capGrowth = 2
/** Words that a reply can write with a capital letter in any place: they are not names. */
const alwaysCapital = new Set(['roomsie', 'mumbai', 'pg', 'bhk', 'ok'])
const isPronounI = (word: string) => /^i(?:['’](?:m|ve|ll|d))?$/i.test(word)
const email = /\S+@\S+\.\S+/
const link = /https?:\/\/|www\.|\b[\w-]+\.(?:com|in|org|net|co|io|me|app)\b/i

const numbersIn = (text: string) => (plainWords(text).match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replaceAll(',', '')))
const wordsIn = (text: string) => text.split(/\s+/).map((word) => word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')).filter(Boolean)
const isCapital = (word: string) => /^\p{Lu}/u.test(word)

/** Capital words not at the start of a sentence. Devanagari has no capitals, so only Latin script gets this check. */
function capitalsInside(text: string) {
  return text.split(/(?<=[.!?।])\s+/).flatMap((sentence) => wordsIn(sentence).slice(1).filter(isCapital))
}

/**
 * The output check of the composer (T-13). A plan with a question needs a question in the text.
 * A name from the words of the person fails too, also at the start of a sentence.
 */
export function passesCheck(text: string, { draft, message, turns, formB }: Pick<ComposerInput, 'draft' | 'message' | 'turns' | 'formB'>) {
  if (text.length > Math.max(capFloor, draft.length * capGrowth)) return false
  if (draft.includes('?') && !text.includes('?')) return false
  if (maskContacts(text) !== text || email.test(text) || link.test(text)) return false

  // "₹20,000" in the draft lets "20k" and "20 hazaar" through, and "₹1,50,000" lets "1.5 lakh" through.
  const planNumbers = new Set(numbersIn(`${draft} ${message}`).flatMap((n) => [n, n / 1000, n / 100_000]))
  if (numbersIn(text).some((n) => !planNumbers.has(n))) return false

  const planWords = new Set([...wordsIn(draft).map((w) => w.toLowerCase()), ...alwaysCapital])
  const inPlan = (word: string) => planWords.has(word.toLowerCase()) || isPronounI(word)
  const said = [message, ...turns.filter(({ role }) => role === 'user').map(({ text: t }) => t), ...formB.map(({ value }) => value)]
  const theirNames = new Set(said.flatMap(wordsIn).filter((w) => isCapital(w) && !inPlan(w)).map((w) => w.toLowerCase()))
  if (wordsIn(text).some((w) => theirNames.has(w.toLowerCase()))) return false
  return capitalsInside(text).every(inPlan)
}
