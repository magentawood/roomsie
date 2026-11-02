/** The words of a person in one form: no nukta, lower case, Devanagari digits as 0 to 9. The parsers and the catalogue read this form. */
export const plainWords = (text: string) => text.normalize('NFD').replace(/\u093C/g, '').toLowerCase().replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x966))

/** A phrase as whole words, in text of words joined by one space. `\b` does not see the edges of a Devanagari word. */
export const phrase = (words: string) => new RegExp(`(?:^| )(?:${words})(?= |$)`)

export const isDevanagari = (word: string) => /\p{Script=Devanagari}/u.test(word)

/** Letters and digits of each script, as plain words joined by one space. */
export const plainText = (text: string) => plainWords(text).replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim()

/** A lookup by the word, or by a key that the word starts with, as "लाख" for "लाखापर्यंत". `isStem` selects the keys that can take an ending. */
export function byStem<T>(table: Record<string, T>, isStem: (key: string) => boolean) {
  const stems = Object.keys(table).filter(isStem)
  return (word: string): T | undefined => table[word] ?? table[stems.find((stem) => word.startsWith(stem)) ?? '']
}
