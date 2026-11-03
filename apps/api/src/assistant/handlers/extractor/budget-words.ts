import type { Budget } from '@roomsie/contract'
import { byStem, isDevanagari, phrase, plainWords } from '../../words'
import { numberWords } from './number-words'

const multipliers: Record<string, number> = {
  k: 1_000, thousand: 1_000, hazaar: 1_000, hazar: 1_000, hajar: 1_000, hajaar: 1_000, हजार: 1_000,
  l: 100_000, lakh: 100_000, lakhs: 100_000, lac: 100_000, lacs: 100_000, लाख: 100_000,
}
/** Words that make the amount a minimum. Without one, a single amount is the maximum, as the budget bands are. */
const minimum = phrase('above|over|more than|min|minimum|at ?least|kam se kam|upar|jyada|zyada|jast|plus|starting|ज्यादा|अधिक|ऊपर|कम से कम|जास्त|किमान')
/** "not more than 20k" or "20k se zyada nahi" is a maximum. */
const notMore = phrase('(?:not|no) (?:more than|above|over)|(?:jyada|zyada|jast|upar) (?:nahi|nahin|nako)|(?:ज्यादा|अधिक|ऊपर|जास्त) (?:नहीं|नही|नाही|नको)')
/** The words that join the two ends of a range, as in "15 se 20 hazaar". */
const rangeWords = new Set(['to', 'se', 'te', 'and', 'aur', 'ani', 'से', 'ते', 'और', 'आणि'])

type Amount = { value: number; multiplier: number | null; at: number }

/** A unit, also with a Marathi ending, as "लाखापर्यंत" or "हजारांपेक्षा". */
const unitOf = byStem(multipliers, (unit) => isDevanagari(unit) || unit.length >= 4)
/** The units that people write next to the digits, as "20k" or "1.5L". */
const gluedUnits = 'k|l|lakhs?|lacs?'

function amountsIn(words: string[]): Amount[] {
  const amounts: Amount[] = []
  let half = 0
  words.forEach((word, at) => {
    if (word === 'saade' || word === 'sade') half = 0.5
    const value = /^\d+(\.\d+)?$/.test(word) ? Number(word) : numberWords[word]
    if (value !== undefined) {
      amounts.push({ value: value + half, multiplier: null, at })
      half = 0
    } else if (unitOf(word) && amounts.length && amounts.at(-1)!.multiplier === null) {
      amounts.at(-1)!.multiplier = unitOf(word)!
    }
  })
  return amounts
}

/** Two amounts are a range only when a range word joins them. "20k for 2 people" is one amount. */
const isRange = (words: string[], [low, high]: Amount[]) =>
  !!low && !!high && words.slice(low.at + 1, high.at).some((w) => rangeWords.has(w)) && words.slice(low.at + 1, high.at).every((w) => rangeWords.has(w) || !!unitOf(w))

/** A bare amount below 100 is in thousands, as in "20 tak". From 100 to 999 the unit is not known, so it gives null. */
const rupeesOf = ({ value, multiplier }: Amount) => {
  if (multiplier) return Math.round(value * multiplier)
  if (value < 100) return Math.round(value * 1_000)
  return value < 1_000 ? null : Math.round(value)
}

/** The words of a text, with the units apart from the digits and the ends of a range joined by "to". */
function partsOf(words: string) {
  const text = plainWords(words)
    .replace(/(\d),(?=\d)/g, '$1')
    .replace(/₹|\brs\b\.?|\binr\b/g, ' ')
    // "15-20k", "15k-20k" and "15 hazaar - 20 hazaar".
    .replace(new RegExp(`(\\d(?:\\s*(?:${gluedUnits}|thousand|ha[zj]aa?r|हजार|लाख))?)\\s*[-–]\\s*(?=\\d)`, 'g'), '$1 to ')
    .replace(new RegExp(`(\\d)(${gluedUnits})\\b`, 'g'), '$1 $2')
    .replace(/\+/g, ' plus ')
  return text.split(/[^\p{L}\p{M}\p{N}.]+/u).map((w) => w.replace(/^\.+|\.+$/g, '')).filter(Boolean)
}

/** The rupees of each amount with a unit, as "tees hazaar" or "20k" (T-13). */
export const unitAmountsIn = (words: string) => amountsIn(partsOf(words)).flatMap((a) => (a.multiplier ? [rupeesOf(a)!] : []))

/** The monthly budget in the words of the person, or null if the words give no amount (PD7: code parses numbers, not the model). */
export function parseBudget(words: string): Budget | null {
  const parts = partsOf(words)
  const amounts = amountsIn(parts)
  if (isRange(parts, amounts)) {
    const [low, high] = amounts as [Amount, Amount]
    // "15 to 20k": the unit of the second amount is also the unit of the first.
    const [a, b] = [rupeesOf({ ...low, multiplier: low.multiplier ?? high.multiplier }), rupeesOf(high)]
    return a == null || b == null ? null : { min: Math.min(a, b), max: Math.max(a, b) }
  }
  // Of "2 log ke liye 20k", the rent is the amount with a unit, or one of 1,000 or more.
  const amount = amounts.find((a) => a.multiplier || a.value >= 1_000) ?? amounts[0]
  const rupees = amount ? rupeesOf(amount) : null
  if (rupees === null) return null
  const joined = parts.join(' ')
  return minimum.test(joined) && !notMore.test(joined) ? { min: rupees, max: null } : { min: null, max: rupees }
}
