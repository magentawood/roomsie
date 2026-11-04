import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { languages } from '../eval/set'
import { isDevanagari } from '../src/assistant/words'
import { observationTopicKeys } from '../src/db/seed-axes'
import file from '../eval/observer-sentences.json'

const sentence = z.strictObject({
  id: z.string(),
  text: z.string().min(1),
  language: z.enum(languages),
  script: z.enum(['latin', 'devanagari']),
  /** The topics of the notes that the sentence gives. Empty: a sentence with no note, as one about health or religion. */
  expected: z.array(z.string()),
})
const { sentences } = z.strictObject({ version: z.literal(1), sentences: z.array(sentence) }).parse(file)

describe('the eval sentences of the observer (T-36)', () => {
  it('has one id each, at least 8 sentences in each language, and Marathi and Hinglish in Devanagari', () => {
    expect(new Set(sentences.map((s) => s.id)).size).toBe(sentences.length)
    for (const language of languages) expect(sentences.filter((s) => s.language === language).length, language).toBeGreaterThanOrEqual(8)
    for (const language of ['hinglish', 'marathi']) expect(sentences.some((s) => s.language === language && s.script === 'devanagari'), language).toBe(true)
  })

  it('marks the script of each sentence from its letters', () => {
    for (const { id, text, script } of sentences) expect(script, id).toBe(isDevanagari(text) ? 'devanagari' : 'latin')
  })

  it('uses each topic of the seed and no other, and has some sentences with no note', () => {
    expect(new Set(sentences.flatMap((s) => s.expected))).toEqual(new Set(observationTopicKeys))
    expect(sentences.some((s) => s.expected.length === 0)).toBe(true)
  })
})
