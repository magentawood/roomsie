import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { observer } from '../src/assistant/handlers/observer/observer'
import { assistantSettings } from '../src/assistant/settings'
import { observationTopics } from '../src/db/schema'
import { modelSettings } from '../src/models/settings'
import { createTestDb, type TestDb } from './db'
import { answer, down, fakeRequest, fakeVendors, keys, scored } from './vendors'

let testDb: TestDb

beforeAll(async () => {
  testDb = await createTestDb()
  await testDb.db.insert(observationTopics).values([
    { key: 'guest_frequency', label: 'Guests and partners who stay over' },
    { key: 'work_pattern', label: 'Work hours and work from home' },
    { key: 'retired_topic', label: 'Retired', active: false },
  ])
})
afterAll(() => testDb.drop())
afterEach(() => { vi.unstubAllGlobals() })

const goalId = '0198f2c4-7a10-7c4e-9a3b-5d2e8f6a1b20'
let request = fakeRequest()
const observeAll = (text: string, settings: Record<string, string> = {}) =>
  observer({ goalId, text, last: null }, { req: (request = fakeRequest()).req, db: testDb.db, models: modelSettings.parse(keys)!, settings: assistantSettings.parse(settings) })
const observe = async (text: string, settings?: Record<string, string>) => (await observeAll(text, settings)).notes
const partner = { key: 'guest_frequency', kind: 'concern', value: 'Partner stays over most nights', evidence: 'my partner basically lives with me' }

describe('the observer', () => {
  it('gives a note with the quote as the turn has it, and the confidence of its topic and kind', async () => {
    const requests = fakeVendors({ observer: { deepseek: [scored({ notes: [partner] }, { guest_frequency: 0.9, concern: 0.8 })] } })
    const notes = await observe('Room in Bandra.  My partner  basically lives with me')
    expect(notes).toEqual([{ ...partner, evidence: 'My partner  basically lives with me', confidence: expect.closeTo(0.72, 5) }])
    expect(requests.observer).toHaveLength(1)
    expect(requests.observer[0]!.body).toMatchObject({ logprobs: true })
    const system = (requests.observer[0]!.body as { messages: { content: string }[] }).messages[0]!.content
    expect(system).toContain('guest_frequency: Guests and partners who stay over')
    expect(system).not.toContain('retired_topic')
  })

  it('rejects a note whose quote is not word for word in the turn, or is part of a longer word', async () => {
    fakeVendors({ observer: { deepseek: [scored({ notes: [partner, { ...partner, key: 'work_pattern', evidence: 'work nights' }] })] } })
    expect(await observeAll('my partner lives with me, I work night shifts')).toEqual({ version: 1, notes: [], rejected: 2 })
    fakeVendors({ observer: { deepseek: [scored({ notes: [{ ...partner, evidence: 'partner basically' }] })] } })
    expect(await observe('my copartner basically lives with me')).toEqual([])
  })

  it('accepts a Devanagari quote in a different Unicode form', async () => {
    // The model gives ज़ as one code point, and the person typed ज and the nukta.
    fakeVendors({ observer: { deepseek: [scored({ notes: [{ ...partner, evidence: 'पार्टनर \u095Bयादातर यहीं' }] })] } })
    const text = 'मेरा पार्टनर \u091C\u093Cयादातर यहीं रहता है'
    expect(await observe(text)).toMatchObject([{ evidence: 'पार्टनर \u091C\u093Cयादातर यहीं' }])
  })

  it('drops a topic that is not in the catalogue, or is retired', async () => {
    fakeVendors({ observer: { deepseek: [scored({ notes: [{ ...partner, key: 'retired_topic' }, { ...partner, key: 'pets' }] })] } })
    expect(await observe('my partner basically lives with me')).toEqual([])
  })

  it('gives a note of Gemini the confidence of the setting', async () => {
    fakeVendors({ observer: { deepseek: [down()], gemini: [answer(JSON.stringify({ notes: [partner] }))] } })
    expect(await observe('my partner basically lives with me', { OBSERVER_UNSCORED_CONFIDENCE: '0.4' })).toMatchObject([{ confidence: 0.4 }])
    expect(request.req.log.error).not.toHaveBeenCalled()
  })

  it('gives the confidence of the setting when the tokens of DeepSeek do not hold the topic', async () => {
    const tokens = [...JSON.stringify({ notes: [] })].map((token) => ({ token, logprob: 0 }))
    fakeVendors({ observer: { deepseek: [answer(JSON.stringify({ notes: [partner] }), undefined, tokens)] } })
    expect(await observe('my partner basically lives with me')).toMatchObject([{ confidence: 0.5 }])
    expect(request.req.log.error).toHaveBeenCalledTimes(1)
  })

  it('keeps one note for each topic: the first', async () => {
    fakeVendors({ observer: { deepseek: [scored({ notes: [partner, { ...partner, value: 'Partner visits', evidence: 'lives with me' }] })] } })
    expect(await observe('my partner basically lives with me')).toMatchObject([{ value: partner.value }])
  })

  it('gives no notes when no model answers', async () => {
    fakeVendors({ observer: { deepseek: [down(), down()], gemini: [down()] } })
    expect(await observe('my partner basically lives with me')).toEqual([])
  })
})
