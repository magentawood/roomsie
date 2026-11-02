/** The words of a person in one form: no nukta, lower case, Devanagari digits as 0 to 9. The parsers and the catalogue read this form. */
export const plainWords = (text: string) => text.normalize('NFD').replace(/\u093C/g, '').toLowerCase().replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x966))

/** A phrase as whole words, in text of words joined by one space. `\b` does not see the edges of a Devanagari word. */
export const phrase = (words: string) => new RegExp(`(?:^| )(?:${words})(?= |$)`)

/** A word in Devanagari script. */
export const isDevanagari = (word: string) => /\p{Script=Devanagari}/u.test(word)
