import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import type { FastifyRequest } from 'fastify'
import { z } from 'zod'
import { modelCheckResponse } from '@roomsie/contract'
import { ModelUnavailable } from '../src/models/models'
import { modelSettings } from '../src/models/settings'
import { events as eventRows } from '../src/analytics/schema'
import { testApp, type TestApp } from './app'
import { createTestAnalyticsDb, type TestAnalyticsDb } from './db'
import { answer, deepseek, fakeRequest, fakeVendors, gemini, keys } from './vendors'

const timeout = () => new DOMException('The operation timed out.', 'TimeoutError')
/** A response whose headers came, and whose body then failed. */
const brokenBody = (err: Error) => ({ ok: true, status: 200, json: () => Promise.reject(err) }) as unknown as Response

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

  it('gives the token probabilities of DeepSeek in a scored call', async () => {
    const tokens = [{ token: '{"intent":"', logprob: -0.01 }, { token: 'room', logprob: -0.4 }, { token: '"}', logprob: 0 }]
    const requests = fakeVendors({ deepseek: [answer('{"intent":"room"}', undefined, tokens)] })
    const { req } = fakeRequest()
    expect(await models.scored({ req, role: 'extractor', system: 'Fill the intent slot.', messages: [{ role: 'user', content: 'room' }], schema: intent, session })).toEqual({ value: { intent: 'room' }, tokens, model: 'deepseek-flash' })
    expect(requests[0]!.body).toMatchObject({ logprobs: true, response_format: { type: 'json_object' } })
  })

  it('asks Gemini with no logprobs field, because Gemini refuses it, and gives no probabilities', async () => {
    const requests = fakeVendors({ deepseek: [new Response('busy', { status: 503 })], gemini: [answer('{"intent":"room"}')] })
    const { req } = fakeRequest()
    expect(await models.scored({ req, role: 'extractor', system: 'Fill the intent slot.', messages: [{ role: 'user', content: 'room' }], schema: intent, session })).toEqual({ value: { intent: 'room' }, tokens: null, model: 'gemini-3.5-flash-lite' })
    expect(requests[1]!.body).not.toHaveProperty('logprobs')
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

describe('the alert check route (T-29)', () => {
  let t: TestApp<'moderator' | 'member'>
  beforeAll(async () => {
    t = await testApp(['moderator', 'member'], undefined, { MODERATOR_UIDS: 'uid-moderator', TELEGRAM_BOT_TOKEN: 'bot-token', TELEGRAM_CHAT_ID: '-100123' })
  })
  afterAll(async () => { await t.close() })

  it('sends one Telegram message through the spend alert, for moderators only', async () => {
    const requests = fakeVendors({})
    expect((await t.call('moderator', 'POST', '/v1/admin/alert-check')).statusCode).toBe(204)
    expect(requests.telegram.map((r) => [r.url, r.body])).toEqual([['https://api.telegram.org/botbot-token/sendMessage', { chat_id: '-100123', text: 'roomsie: the spend alert works.' }]])
    expect((await t.call('member', 'POST', '/v1/admin/alert-check')).statusCode).toBe(404)
    expect(requests.telegram).toHaveLength(1)
  })

  it('gives 502 with the answer of Telegram when the bot or the chat is wrong', async () => {
    fakeVendors({ telegram: [new Response('Unauthorized', { status: 401 })] })
    const res = await t.call('moderator', 'POST', '/v1/admin/alert-check')
    expect([res.statusCode, res.json()]).toEqual([502, { error: 'Telegram answered 401' }])
  })

  it('gives 503 when the Telegram settings are not set', async () => {
    const bare = await testApp(['moderator'], undefined, { MODERATOR_UIDS: 'uid-moderator' })
    expect((await bare.call('moderator', 'POST', '/v1/admin/alert-check')).statusCode).toBe(503)
    await bare.close()
  })
})
