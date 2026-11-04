import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { formA, isOpenSlot, lifestyleAxes, mustHaveKeys } from '@roomsie/contract'
import { areas } from '../src/db/schema'
import { seedAreas } from '../src/db/seed-areas'
import { createTestDb, type TestDb } from './db'

/** The eval sentences of M-03: T-27 scores the extractor on them. A slot that a label does not name must stay empty. */
const sentence = z.strictObject({
  id: z.string().regex(/^[ehm]\d{2}$/),
  text: z.string().min(1),
  language: z.enum(['english', 'hinglish', 'marathi']),
  script: z.enum(['latin', 'devanagari', 'mixed']),
  mix: z.enum(['none', 'light', 'medium', 'heavy']),
  vague: z.boolean(),
  expected: z.record(z.string(), z.unknown()),
})
const evalSet = z.strictObject({ version: z.literal(1), today: z.iso.date(), sentences: z.array(sentence) })
const set = evalSet.parse(JSON.parse(readFileSync(new URL('../eval/sentences.json', import.meta.url), 'utf8')))

/** The label as a Form A of stated answers: the contract checks each value. */
function formOf(expected: Record<string, unknown>) {
  const slot = (value: unknown) => ({ source: 'stated', value })
  const { lifestyle = {}, mustHaves = {}, ...top } = expected as { lifestyle?: Record<string, unknown>; mustHaves?: Record<string, unknown> }
  return formA.parse({
    ...Object.fromEntries(Object.entries(top).map(([key, value]) => [key, slot(value)])),
    lifestyle: Object.fromEntries(Object.entries(lifestyle).map(([key, value]) => [key, slot(value)])),
    mustHaves: Object.fromEntries(Object.entries(mustHaves).map(([key, value]) => [key, slot(value)])),
  })
}

let db: TestDb
beforeAll(async () => {
  db = await createTestDb()
  await seedAreas(db.db)
})
afterAll(() => db.drop())

describe('the eval sentences (M-03)', () => {
  it('has 50 sentences with one id each: 15 English, 18 Hinglish and 17 Marathi, and 10 vague on purpose', () => {
    const count = (language: string) => set.sentences.filter((s) => s.language === language).length
    expect(set.sentences).toHaveLength(50)
    expect(new Set(set.sentences.map((s) => s.id)).size).toBe(50)
    expect([count('english'), count('hinglish'), count('marathi')]).toEqual([15, 18, 17])
    expect(set.sentences.filter((s) => s.vague)).toHaveLength(10)
  })

  it('labels each sentence with valid values of Form A, and each area with a slug of the seed', async () => {
    const slugs = new Set((await db.db.select({ slug: areas.slug }).from(areas)).map(({ slug }) => slug))
    for (const { id, expected } of set.sentences) {
      const form = formOf(expected)
      const named = Array.isArray(form.areas.value) ? form.areas.value : []
      expect(named.filter((slug) => !slugs.has(slug)), id).toEqual([])
    }
  })

  it('labels at least one slot of each vague sentence as unclear, and no slot of a clear sentence', () => {
    for (const { id, vague, expected } of set.sentences) {
      const form = formOf(expected)
      const slots = [form.intent, form.roomType, form.whosMoving, ...lifestyleAxes.map((a) => form.lifestyle[a]), ...mustHaveKeys.map((k) => form.mustHaves[k])]
      const unclear = slots.filter((s) => s.source === 'stated' && isOpenSlot(s)).length
      expect(vague ? unclear > 0 : unclear === 0, id).toBe(true)
    }
  })

  it('has the forms that people type: Mumbai areas, "20k", "bees hazaar" and "next month end"', () => {
    const texts = set.sentences.map((s) => s.text.toLowerCase())
    for (const phrase of ['20k', 'bees hazaar', 'next month end']) expect(texts.some((t) => t.includes(phrase)), phrase).toBe(true)
    expect(set.sentences.filter((s) => 'areas' in s.expected).length).toBeGreaterThanOrEqual(40)
  })
})
