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
  const wanted = fold(quote.trim()).map(({ unit }) => unit).join('')
  if (!wanted) return null
  for (let at = folded.indexOf(wanted); at >= 0; at = folded.indexOf(wanted, at + 1)) {
    const end = at + wanted.length
    if (!isWordUnit(folded[at - 1]) && !isWordUnit(folded[end])) return text.slice(units[at]!.from, units[end - 1]!.to)
  }
  return null
}
