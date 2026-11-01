import type { Budget } from '@roomsie/contract'
import { numberWords } from './number-words'

const multipliers: Record<string, number> = {
  k: 1_000, thousand: 1_000, hazaar: 1_000, hazar: 1_000, hajar: 1_000, hajaar: 1_000, हजार: 1_000,
  l: 100_000, lakh: 100_000, lakhs: 100_000, lac: 100_000, lacs: 100_000, लाख: 100_000,
}
/** Words that make the amount a minimum. Without one, a single amount is the maximum, as the budget bands are. */
const minimum = /\b(above|over|more than|min|minimum|at ?least|upar|jyada|zyada|plus|starting)\b/

type Amount = { value: number; multiplier: number | null }

function amountsIn(words: string[]): Amount[] {
  const amounts: Amount[] = []
  let half = 0
  for (const word of words) {
    if (word === 'saade' || word === 'sade') half = 0.5
    const value = /^\d+(\.\d+)?$/.test(word) ? Number(word) : numberWords[word]
    if (value !== undefined) {
      amounts.push({ value: value + half, multiplier: null })
      half = 0
    } else if (multipliers[word] && amounts.length && amounts.at(-1)!.multiplier === null) {
      amounts.at(-1)!.multiplier = multipliers[word]
    }
  }
  return amounts
}

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
  const amounts = amountsIn(text.split(/[^\p{L}\p{M}\p{N}.]+/u).map((w) => w.replace(/^\.+|\.+$/g, '')).filter(Boolean))
  if (amounts.length >= 2) {
    const [low, high] = amounts as [Amount, Amount]
    // "15 to 20k": the unit of the second amount is also the unit of the first.
    const bounds = [rupeesOf({ ...low, multiplier: low.multiplier ?? high.multiplier }), rupeesOf(high)]
    if (bounds[0] == null || bounds[1] == null) return null
    const [min, max] = (bounds as number[]).sort((a, b) => a - b)
    return { min: min!, max: max! }
  }
  const rupees = amounts.length ? rupeesOf(amounts[0]!) : null
  if (rupees === null) return null
  return minimum.test(text) ? { min: rupees, max: null } : { min: null, max: rupees }
}
