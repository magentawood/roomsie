export { plainText, plainWords } from '@roomsie/contract'

/** A phrase as whole words, in text of words joined by one space. `\b` does not see the edges of a Devanagari word. */
export const phrase = (words: string) => new RegExp(`(?:^| )(?:${words})(?= |$)`)

export const isDevanagari = (word: string) => /\p{Script=Devanagari}/u.test(word)

/** A lookup by the word, or by a key that the word starts with, as "लाख" for "लाखापर्यंत". `isStem` selects the keys that can take an ending. */
export function byStem<T>(table: Record<string, T>, isStem: (key: string) => boolean) {
  const stems = Object.keys(table).filter(isStem)
  return (word: string): T | undefined => table[word] ?? table[stems.find((stem) => word.startsWith(stem)) ?? '']
}

const isWordUnit = (unit: string | undefined) => unit !== undefined && /[\p{L}\p{M}\p{N}]/u.test(unit)

/** The text in lower case, with each run of white space as one space, and the position in `text` of each unit. */
function fold(text: string) {
  const units: { unit: string; from: number; to: number }[] = []
  let at = 0
  for (const char of text) {
    const to = at + char.length
    if (/\s/u.test(char)) {
      if (units.at(-1)?.unit !== ' ') units.push({ unit: ' ', from: at, to })
    } else for (const unit of char.normalize('NFD').toLowerCase()) units.push({ unit, from: at, to })
    at = to
  }
  return units
}

/**
 * The words of `text` that `quote` gives, as `text` has them, or null. The words must be whole and in the same order,
 * and only the capitals, the white space and the Unicode form can differ (T-36).
 */
export function quoteIn(text: string, quote: string) {
  const units = fold(text)
  const folded = units.map(({ unit }) => unit).join('')
  // A unit can be two code units of the string, as an emoji, so each index of the string maps to its unit.
  const unitAt = units.flatMap(({ unit }, i) => Array<number>(unit.length).fill(i))
  const wanted = fold(quote.trim()).map(({ unit }) => unit).join('')
  if (!wanted) return null
  for (let at = folded.indexOf(wanted); at >= 0; at = folded.indexOf(wanted, at + 1)) {
    const [first, last] = [unitAt[at]!, unitAt[at + wanted.length - 1]!]
    if (!isWordUnit(units[first - 1]?.unit) && !isWordUnit(units[last + 1]?.unit)) return text.slice(units[first]!.from, units[last]!.to)
  }
  return null
}

/**
 * The gender in an answer to "Are you a man, a woman or non-binary?", in English, Hinglish, Marathi or Devanagari. Null: none, or
 * words of two genders. Only the answer to that question reads it, so "I want female flatmates" elsewhere sets nothing.
 */
export function genderIn(text: string): 'male' | 'female' | 'non_binary' | null {
  const words = ` ${text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}-]+/gu, ' ')} `
  const has = (list: string[]) => list.some((w) => words.includes(` ${w} `))
  if (has(['non-binary', 'nonbinary', 'non', 'nb', 'enby', 'neither']) || /non[ -]?binary|नॉन[ -]?बाइनरी/.test(text.toLowerCase())) return 'non_binary'
  const male = has(['man', 'male', 'guy', 'boy', 'm', 'mard', 'ladka', 'purush', 'mulga', 'पुरुष', 'लड़का', 'लडका', 'मुलगा'])
  const female = has(['woman', 'female', 'girl', 'lady', 'f', 'aurat', 'ladki', 'mahila', 'stree', 'mulgi', 'महिला', 'लड़की', 'लडकी', 'स्त्री', 'मुलगी'])
  return male === female ? null : male ? 'male' : 'female'
}
