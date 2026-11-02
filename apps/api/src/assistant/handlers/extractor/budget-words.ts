import type { Budget } from '@roomsie/contract'
import { numberWords } from './number-words'

const multipliers: Record<string, number> = {
  k: 1_000, thousand: 1_000, hazaar: 1_000, hazar: 1_000, hajar: 1_000, hajaar: 1_000, हजार: 1_000,
  l: 100_000, lakh: 100_000, lakhs: 100_000, lac: 100_000, lacs: 100_000, लाख: 100_000,
}
/** A phrase as whole words. `\b` does not see the edges of a Devanagari word. */
const phrase = (words: string) => new RegExp(`(?:^| )(?:${words})(?= |$)`)
/** Words that make the amount a minimum. Without one, a single amount is the maximum, as the budget bands are. */
const minimum = phrase('above|over|more than|min|minimum|at ?least|kam se kam|upar|jyada|zyada|jast|plus|starting|से ज्यादा|से अधिक|ऊपर|कम से कम|पेक्षा जास्त|किमान')
/** "not more than 20k" or "20k se zyada nahi" is a maximum. */
const notMore = phrase('(?:not|no) (?:more than|above|over)|(?:jyada|zyada|jast|upar) (?:nahi|nahin|nako)|(?:ज्यादा|अधिक|ऊपर|जास्त) (?:नहीं|नही|नाही|नको)')
/** The words that join the two ends of a range, as in "15 se 20 hazaar". */
const rangeWords = new Set(['to', 'se', 'te', 'and', 'aur', 'ani', 'से', 'ते', 'और', 'आणि'])

type Amount = { value: number; multiplier: number | null; at: number }

function amountsIn(words: string[]): Amount[] {
  const amounts: Amount[] = []
  let half = 0
  words.forEach((word, at) => {
    if (word === 'saade' || word === 'sade') half = 0.5
    const value = /^\d+(\.\d+)?$/.test(word) ? Number(word) : numberWords[word]
    if (value !== undefined) {
      amounts.push({ value: value + half, multiplier: null, at })
      half = 0
    } else if (multipliers[word] && amounts.length && amounts.at(-1)!.multiplier === null) {
      amounts.at(-1)!.multiplier = multipliers[word]
    }
  })
  return amounts
}

/** Two amounts are a range only when a range word joins them. "20k for 2 people" is one amount. */
const isRange = (words: string[], [low, high]: Amount[]) =>
  !!low && !!high && words.slice(low.at + 1, high.at).some((w) => rangeWords.has(w)) && words.slice(low.at + 1, high.at).every((w) => rangeWords.has(w) || !!multipliers[w])

/** A bare amount below 100 is in thousands, as in "20 tak". From 100 to 999 the unit is not known, so it gives null. */
const rupeesOf = ({ value, multiplier }: Amount) => {
  if (multiplier) return Math.round(value * multiplier)
  if (value < 100) return Math.round(value * 1_000)
  return value < 1_000 ? null : Math.round(value)
}

/** The monthly budget in the words of the person, or null if the words give no amount (PD7: code parses numbers, not the model). */
export function parseBudget(words: string): Budget | null {
  const text = words.normalize('NFD').replace(/\u093C/g, '').toLowerCase()
    .replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x966))
    .replace(/(\d),(?=\d)/g, '$1')
    .replace(/₹|\brs\b\.?|\binr\b/g, ' ')
    .replace(/(\d)\s*-\s*(\d)/g, '$1 to $2')
    .replace(/(\d)(k|l|lakhs?|lacs?)\b/g, '$1 $2')
    .replace(/\+/g, ' plus ')
  const parts = text.split(/[^\p{L}\p{M}\p{N}.]+/u).map((w) => w.replace(/^\.+|\.+$/g, '')).filter(Boolean)
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
