import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import type { FastifyRequest } from 'fastify'
import { z } from 'zod'
import { analyticsEvent, modelCheckResponse, type AnalyticsEvent } from '@roomsie/contract'
import { ModelUnavailable } from '../src/models/models'
import { modelSettings } from '../src/models/settings'
import { events as eventRows } from '../src/analytics/schema'
import { testApp, type TestApp } from './app'
import { createTestAnalyticsDb, type TestAnalyticsDb } from './db'

const deepseek = 'https://api.deepseek.com/chat/completions'
const gemini = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
const keys = { DEEPSEEK_API_KEY: 'deepseek-key', GEMINI_API_KEY: 'gemini-key' }

/** Each vendor answers with the next reply of its list. A reply that is an Error makes fetch throw it, as a timeout does. */
function fakeVendors(replies: { deepseek?: (Response | Error)[]; gemini?: (Response | Error)[] }) {
  const requests: { url: string; body: Record<string, unknown>; authorization: string | null }[] = []
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    requests.push({ url, body: JSON.parse(String(init.body)), authorization: new Headers(init.headers).get('authorization') })
    const reply = (url === deepseek ? replies.deepseek : replies.gemini)?.shift()
    if (!reply) throw new Error(`no reply left for ${url}`)
    if (reply instanceof Error) throw reply
    return reply
  })
  return requests
}
const answer = (content: string, usage: Record<string, unknown> = { prompt_tokens: 120, completion_tokens: 8, prompt_cache_hit_tokens: 100 }) =>
  Response.json({ choices: [{ message: { role: 'assistant', content } }], usage })
const timeout = () => new DOMException('The operation timed out.', 'TimeoutError')
/** A response whose headers came, and whose body then failed. */
const brokenBody = (err: Error) => ({ ok: true, status: 200, json: () => Promise.reject(err) }) as unknown as Response

/** A request with a fake analytics, so a test reads the events that the module records. Each event must pass the strict schema, as in track(). */
function fakeRequest() {
  const events: AnalyticsEvent[] = []
  const log = { info: vi.fn(), error: vi.fn() }
  const req = { server: { analytics: { track: (_req: unknown, event: AnalyticsEvent) => events.push(analyticsEvent.parse(event)) } }, log, user: null } as unknown as FastifyRequest
  return { req, events }
}

const models = modelSettings.parse(keys)!
const intent = z.object({ intent: z.enum(['room', 'flatmate', 'unclear']) })
const session = '0198f2c4-7a10-7c4e-9a3b-5d2e8f6a1b20'
const ask = (req: FastifyRequest) => models.json({ req, role: 'extractor', system: 'Fill the intent slot.', messages: [{ role: 'user', content: 'room chahiye powai mein' }], schema: intent, session })

afterEach(() => { vi.unstubAllGlobals() })

describe('the models module', () => {
  it('asks DeepSeek first, with the system prompt first and the JSON mode, and records the call', async () => {
    const requests = fakeVendors({ deepseek: [answer('{"intent":"room"}')] })
    const { req, events } = fakeRequest()
    expect(await ask(req)).toEqual({ intent: 'room' })
    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({
      url: deepseek,
      authorization: 'Bearer deepseek-key',
      body: { model: 'deepseek-flash', response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Fill the intent slot.' }, { role: 'user', content: 'room chahiye powai mein' }] },
    })
    expect(events).toEqual([{
      name: 'model_called', eventVersion: 1, role: 'extractor', model: 'deepseek-flash', tokensIn: 120, cachedTokensIn: 100, tokensOut: 8,
      ms: expect.any(Number), fallback: false, outcome: 'ok', session,
    }])
  })

  it.each([
    ['a timeout', timeout(), false],
    ['a 5xx', new Response('busy', { status: 503 }), false],
    ['a 429', new Response('slow down', { status: 429 }), false],
    ['a body that times out', brokenBody(timeout()), false],
    ['a connection lost while the body arrives', brokenBody(new TypeError('terminated')), false],
    ['a 4xx other than 429, such as a bad key, and reports it', new Response('bad key', { status: 401 }), true],
  ])('asks Gemini one time after %s', async (_case, failure, reported) => {
    const requests = fakeVendors({ deepseek: [failure], gemini: [answer('{"intent":"flatmate"}', { prompt_tokens: 90, completion_tokens: 6, prompt_tokens_details: { cached_tokens: 64 } })] })
    const { req, events } = fakeRequest()
    expect(await ask(req)).toEqual({ intent: 'flatmate' })
    expect(requests.map((r) => r.url)).toEqual([deepseek, gemini])
    expect(requests[1]).toMatchObject({ authorization: 'Bearer gemini-key', body: { model: 'gemini-3.5-flash-lite' } })
    expect(events.map((e) => 'outcome' in e && [e.model, e.outcome, e.fallback])).toEqual([['deepseek-flash', 'failed', false], ['gemini-3.5-flash-lite', 'ok', true]])
    expect(events[1]).toMatchObject({ tokensIn: 90, cachedTokensIn: 64, tokensOut: 6 })
    expect(req.log.error).toHaveBeenCalledTimes(reported ? 1 : 0)
  })

  it('asks DeepSeek once more after an answer that fails its schema, then Gemini', async () => {
    const requests = fakeVendors({ deepseek: [answer('{"intent":"villa"}'), answer('not json')], gemini: [answer('{"intent":"unclear"}')] })
    const { req, events } = fakeRequest()
    expect(await ask(req)).toEqual({ intent: 'unclear' })
    expect(requests.map((r) => r.url)).toEqual([deepseek, deepseek, gemini])
    expect(events.map((e) => 'outcome' in e && e.outcome)).toEqual(['invalid', 'invalid', 'ok'])
  })

  it('reads a body that is not JSON as an invalid answer', async () => {
    const requests = fakeVendors({ deepseek: [new Response('<html>Bad gateway</html>'), answer('{"intent":"room"}')] })
    const { req } = fakeRequest()
    expect(await ask(req)).toEqual({ intent: 'room' })
    expect(requests.map((r) => r.url)).toEqual([deepseek, deepseek])
  })

  it('throws, and reports it one time, when Gemini also fails', async () => {
    fakeVendors({ deepseek: [new Response('down', { status: 500 })], gemini: [new Response('bad key', { status: 401 })] })
    const { req } = fakeRequest()
    await expect(ask(req)).rejects.toBeInstanceOf(ModelUnavailable)
    expect(req.log.error).toHaveBeenCalledTimes(1)
  })

  it('refuses a model name of a third vendor', () => {
    expect(() => modelSettings.parse({ ...keys, MODEL_PRIMARY: 'gpt-5' })).toThrow('deepseek-')
  })

  it('gives the text of a text call, with no JSON mode', async () => {
    const requests = fakeVendors({ deepseek: [answer('Powai has many rooms near the lake.')] })
    const { req } = fakeRequest()
    expect(await models.text({ req, role: 'composer', system: 'Reply in the language of the user.', messages: [{ role: 'user', content: 'Powai?' }], session: null })).toBe('Powai has many rooms near the lake.')
    expect(requests[0]!.body).not.toHaveProperty('response_format')
  })
})

describe('the model check route', () => {
  let t: TestApp<'moderator' | 'member'>
  let analytics: TestAnalyticsDb
  beforeAll(async () => {
    analytics = await createTestAnalyticsDb()
    t = await testApp(['moderator', 'member'], undefined, { MODERATOR_UIDS: 'uid-moderator', ...keys }, analytics.db)
  })
  afterAll(async () => {
    await t.close()
    await analytics.drop()
  })

  it('asks each model one time, for moderators only, and shows a bad key as no answer', async () => {
    fakeVendors({ deepseek: [new Response('bad key', { status: 401 })], gemini: [answer('ok', { prompt_tokens: 90, completion_tokens: 6 })] })
    const res = await t.call('moderator', 'POST', '/v1/admin/model-check')
    expect(res.statusCode).toBe(200)
    expect(modelCheckResponse.parse(res.json()).models).toEqual([
      { model: 'deepseek-flash', answered: false, ms: expect.any(Number), tokensIn: 0, cachedTokensIn: 0, tokensOut: 0 },
      { model: 'gemini-3.5-flash-lite', answered: true, ms: expect.any(Number), tokensIn: 90, cachedTokensIn: 0, tokensOut: 6 },
    ])
    expect((await t.call('member', 'POST', '/v1/admin/model-check')).statusCode).toBe(404)
    await t.flushEvents()
    const stored = await analytics.db.select({ fields: eventRows.fields }).from(eventRows).where(eq(eventRows.name, 'model_called'))
    expect(stored.map((r) => r.fields)).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'check', model: 'deepseek-flash', outcome: 'failed' }),
      expect.objectContaining({ role: 'check', model: 'gemini-3.5-flash-lite', outcome: 'ok', tokensIn: 90 }),
    ]))
  })

  it('gives 503 when the keys are not set', async () => {
    const bare = await testApp(['moderator'], undefined, { MODERATOR_UIDS: 'uid-moderator' })
    expect((await bare.call('moderator', 'POST', '/v1/admin/model-check')).statusCode).toBe(503)
    await bare.close()
  })
})
