import { describe, expect, it } from 'vitest'
import { formA, formASlots, scopeBands, slotOf } from '@roomsie/contract'
import { isDevanagari } from '../src/assistant/words'
import { areaSlugs } from '../src/db/seed-areas'
import { evalSet, isSearch, type EvalSentence } from '../eval/set'

const { sentences } = evalSet

const stated = (values: Record<string, unknown>) => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { source: 'stated', value }]))
const statedForm = ({ lifestyle = {}, mustHaves = {}, ...top }: EvalSentence['expected']) =>
  formA.safeParse({ ...stated(top), lifestyle: stated(lifestyle), mustHaves: stated(mustHaves) })
/** The script of the letters: digits belong to no script. */
const scriptOf = (text: string) => (isDevanagari(text) ? (/[A-Za-z]/.test(text) ? 'mixed' : 'devanagari') : 'latin')

describe('the eval sentences (M-03)', () => {
  it('has 56 searches with no flag, with one id each: 17 English, 20 Hinglish and 19 Marathi, Marathi in both scripts, some Hinglish in Devanagari, and 10 vague on purpose', () => {
    const searches = sentences.filter(isSearch)
    const of = (language: string) => searches.filter((s) => s.language === language)
    expect(new Set(sentences.map((s) => s.id)).size).toBe(sentences.length)
    expect([of('english').length, of('hinglish').length, of('marathi').length]).toEqual([17, 20, 19])
    expect(searches.filter((s) => s.vague)).toHaveLength(10)
    expect(['latin', 'devanagari'].every((script) => of('marathi').some((s) => s.script === script))).toBe(true)
    expect(of('hinglish').some((s) => s.script === 'devanagari')).toBe(true)
  })

  it('has a sentence in English, in Hinglish, in Hindi in Devanagari and in Marathi for each band that is not core, and two sentences with danger, both sensitive (T-61)', () => {
    for (const band of scopeBands.filter((b) => b !== 'core')) {
      expect(sentences.filter((s) => s.band === band).map((s) => `${s.language} ${s.script}`).toSorted(), band)
        .toEqual(['english latin', 'hinglish devanagari', 'hinglish latin', expect.stringMatching(/^marathi /)])
    }
    expect(sentences.filter((s) => s.danger).map((s) => s.band)).toEqual(['sensitive', 'sensitive'])
  })

  it('has two searches with a community preference, in Hinglish and in Marathi (T-61)', () => {
    expect(sentences.filter((s) => s.community).map((s) => [s.band, s.language])).toEqual([['core', 'hinglish'], ['core', 'marathi']])
  })

  it('labels no slot of Form A for a sentence that only the router scores (T-61)', () => {
    for (const { id, expected } of sentences.filter((s) => !isSearch(s))) expect(expected, id).toEqual({})
  })

  it('has six searches that name a friend: a capital and a lower-case name in English, a lower-case and a Devanagari name in Hinglish and Marathi (T-61)', () => {
    const typed = ({ id, text, names }: EvalSentence) => {
      const name = names.find((n) => text.toLowerCase().includes(n))
      expect(name, id).toBeDefined()
      const at = text.toLowerCase().indexOf(name!)
      const asTyped = text.slice(at, at + name!.length)
      return isDevanagari(asTyped) ? 'devanagari' : /^\p{Lu}/u.test(asTyped) ? 'capital' : 'lower'
    }
    const named = sentences.filter((s) => s.names.length > 0)
    expect(named.every(isSearch)).toBe(true)
    const forms = (language: string) => named.filter((s) => s.language === language).map(typed).toSorted()
    expect([forms('english'), forms('hinglish'), forms('marathi')]).toEqual([['capital', 'lower'], ['devanagari', 'lower'], ['devanagari', 'lower']])
  })

  it('marks the script of each sentence from its letters', () => {
    for (const { id, text, script } of sentences) expect(script, id).toBe(scriptOf(text))
  })

  it('labels each sentence with valid values of Form A, and each area with a slug of the seed', () => {
    const slugs = new Set(areaSlugs)
    for (const { id, expected } of sentences) {
      const form = statedForm(expected)
      expect(form.success, `${id}: ${form.error?.message}`).toBe(true)
      expect(form.data?.areas.value?.filter((slug) => !slugs.has(slug)) ?? [], id).toEqual([])
    }
  })

  it('labels at least one slot of each vague sentence as unclear, and no slot of a clear sentence', () => {
    for (const { id, vague, expected } of sentences) {
      const form = statedForm(expected).data!
      expect(formASlots.some((slot) => slotOf(form, slot).value === 'unclear'), id).toBe(vague)
    }
  })

  it('has the forms that people type: Mumbai areas, "20k", "bees hazaar", an amount with a comma and "next month end"', () => {
    const texts = sentences.map((s) => s.text.toLowerCase())
    for (const pattern of [/20k/, /bees hazaar/, /\d,\d{3}/, /next month end/]) expect(texts.some((t) => pattern.test(t)), String(pattern)).toBe(true)
    expect(sentences.some((s) => 'areas' in s.expected)).toBe(true)
  })
})
