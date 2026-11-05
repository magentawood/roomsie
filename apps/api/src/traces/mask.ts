import { traceMaskedSlots, traceMaskKeep, traceMaskWords } from '@roomsie/contract'

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')
const byLength = (a: string, b: string) => b.length - a.length
const all: readonly string[] = [...traceMaskWords.religion, ...traceMaskWords.community]
const isLatin = (word: string) => /^[\x20-\x7e]+$/.test(word)
// A word in Latin letters with a short ending, and never the start of a longer word, so "sikhna" stays. Devanagari joins each ending to the word.
const latin = all.filter(isLatin).toSorted(byLength).map(escape).join('|')
// A long ई or ी at the end becomes short before an ending, as "ईसाई" in "ईसाइयों", so the short form masks too.
const stems = all.filter((word) => !isLatin(word)).flatMap((word) => [word, word.replace(/ी$/, 'ि').replace(/ई$/, 'इ')])
const devanagari = [...new Set(stems)].toSorted(byLength).map(escape).join('|')
const words = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])(?:(?:${latin})(?:s|es|on|yon|ism|ic)?(?![\\p{L}\\p{M}\\p{N}])|(?:${devanagari})[\\p{L}\\p{M}]*)`, 'giu')
// The value of a masked slot in JSON: an object with no object inside, a list, a string, or a word.
const slots = new RegExp(`"(${traceMaskedSlots.join('|')})"(\\s*):(\\s*)(?!null\\b)(?:\\{[^{}]*\\}|\\[[^\\]]*\\]|"(?:[^"\\\\]|\\\\.)*"|[^,}\\s]+)`, 'g')

const limit = 20_000

/** A text as a trace keeps it (PD20, T-64): each religion and community word is "[hidden]", each masked slot is "set", and the text stops at 20,000 characters. */
export function forTrace(text: string) {
  const masked = text.replace(slots, '"$1"$2:$3"set"').replace(words, (word) => (traceMaskKeep.some((keep) => word.startsWith(keep)) ? word : '[hidden]'))
  return masked.length > limit ? `${masked.slice(0, limit)} [cut]` : masked
}
