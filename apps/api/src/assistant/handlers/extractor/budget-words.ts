import type { Budget } from '@roomsie/contract'
import { numberWords } from './number-words'

const multipliers: Record<string, number> = { k: 1_000, thousand: 1_000, hazaar: 1_000, hazar: 1_000, hajar: 1_000, hajaar: 1_000, l: 100_000, lakh: 100_000, lakhs: 100_000, lac: 100_000, lacs: 100_000 }
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

/** A bare amount below 1,000 is in thousands: nobody pays ₹20 a month. */
const rupeesOf = ({ value, multiplier }: Amount) => Math.round(value * (multiplier ?? (value < 1_000 ? 1_000 : 1)))

/** The monthly budget in the words of the person, or null if the words give no amount (PD7: code parses numbers, not the model). */
export function parseBudget(words: string): Budget | null {
  const text = words.toLowerCase()
    .replace(/(\d),(?=\d)/g, '$1')
    .replace(/₹|\brs\b\.?|\binr\b/g, ' ')
    .replace(/(\d)\s*-\s*(\d)/g, '$1 to $2')
    .replace(/(\d)(k|l|lakhs?|lacs?)\b/g, '$1 $2')
    .replace(/\+/g, ' plus ')
  const amounts = amountsIn(text.split(/[^a-z0-9.]+/).map((w) => w.replace(/^\.+|\.+$/g, '')).filter(Boolean))
  if (amounts.length >= 2) {
    const [low, high] = amounts as [Amount, Amount]
    // "15 to 20k": the unit of the second amount is also the unit of the first.
    const bounds = [rupeesOf({ ...low, multiplier: low.multiplier ?? high.multiplier }), rupeesOf(high)].sort((a, b) => a - b)
    return { min: bounds[0]!, max: bounds[1]! }
  }
  if (!amounts.length) return null
  const rupees = rupeesOf(amounts[0]!)
  return minimum.test(text) ? { min: rupees, max: null } : { min: null, max: rupees }
}
