import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { formA, formASlots, slotOf } from '@roomsie/contract'
import { isDevanagari } from '../src/assistant/words'
import { areaSlugs } from '../src/db/seed-areas'
import file from '../eval/sentences.json'

const sentence = z.strictObject({
  id: z.string(),
  text: z.string().min(1),
  language: z.enum(['english', 'hinglish', 'marathi']),
  script: z.enum(['latin', 'devanagari', 'mixed']),
  mix: z.enum(['none', 'light', 'medium', 'heavy']),
  vague: z.boolean(),
  expected: z.object({ lifestyle: z.record(z.string(), z.unknown()).optional(), mustHaves: z.record(z.string(), z.unknown()).optional() }).catchall(z.unknown()),
})
const { sentences } = z.strictObject({ version: z.literal(1), today: z.iso.date(), sentences: z.array(sentence) }).parse(file)

const stated = (values: Record<string, unknown>) => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { source: 'stated', value }]))
const statedForm = ({ lifestyle = {}, mustHaves = {}, ...top }: z.infer<typeof sentence>['expected']) =>
  formA.safeParse({ ...stated(top), lifestyle: stated(lifestyle), mustHaves: stated(mustHaves) })
/** The script of the letters: digits belong to no script. */
const scriptOf = (text: string) => {
  const [latin, devanagari] = [/[A-Za-z]/.test(text), isDevanagari(text)]
  return latin && devanagari ? 'mixed' : devanagari ? 'devanagari' : 'latin'
}

describe('the eval sentences (M-03)', () => {
  it('has 50 sentences with one id each: 15 English, 18 Hinglish and 17 Marathi, Marathi in both scripts, some Hinglish in Devanagari, and 10 vague on purpose', () => {
    const of = (language: string) => sentences.filter((s) => s.language === language)
    expect(new Set(sentences.map((s) => s.id)).size).toBe(50)
    expect([of('english').length, of('hinglish').length, of('marathi').length]).toEqual([15, 18, 17])
    expect(sentences.filter((s) => s.vague)).toHaveLength(10)
    expect(new Set(of('marathi').map((s) => s.script === 'latin'))).toEqual(new Set([true, false]))
    expect(of('hinglish').some((s) => s.script !== 'latin')).toBe(true)
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
    for (const phrase of [/20k/, /bees hazaar/, /\d,\d{3}/, /next month end/]) expect(texts.some((t) => phrase.test(t)), String(phrase)).toBe(true)
    expect(sentences.some((s) => 'areas' in s.expected)).toBe(true)
  })
})
