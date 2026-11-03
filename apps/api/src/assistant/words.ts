export { plainText, plainWords } from '@roomsie/contract'

/** A phrase as whole words, in text of words joined by one space. `\b` does not see the edges of a Devanagari word. */
export const phrase = (words: string) => new RegExp(`(?:^| )(?:${words})(?= |$)`)

export const isDevanagari = (word: string) => /\p{Script=Devanagari}/u.test(word)

/** A lookup by the word, or by a key that the word starts with, as "लाख" for "लाखापर्यंत". `isStem` selects the keys that can take an ending. */
export function byStem<T>(table: Record<string, T>, isStem: (key: string) => boolean) {
  const stems = Object.keys(table).filter(isStem)
  return (word: string): T | undefined => table[word] ?? table[stems.find((stem) => word.startsWith(stem)) ?? '']
}
