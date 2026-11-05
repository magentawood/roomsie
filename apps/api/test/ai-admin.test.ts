import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import type { FastifyBaseLogger, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { adminHomeResponse, aiOverviewResponse, modelSwitchLogResponse, modelSwitchState } from '@roomsie/contract'
import { createAnalyticsDb } from '../src/analytics/client'
import { events } from '../src/analytics/schema'
import { assistantSettings } from '../src/assistant/settings'
import { modelSpend, modelSwitch } from '../src/db/schema'
import { limitSettings } from '../src/goals/settings'
import { bestEffort } from '../src/analytics/read'
import { aiCard, aiOverview } from '../src/models/overview'
import { modelSettings, spendSettings } from '../src/models/settings'
import { testApp, type TestApp } from './app'
import { createTestAnalyticsDb, type TestAnalyticsDb } from './db'
import { answer, fakeRequest, fakeVendors, gemini, keys } from './vendors'

let t: TestApp<'moderator' | 'member'>
let analytics: TestAnalyticsDb
beforeAll(async () => {
  analytics = await createTestAnalyticsDb()
  t = await testApp(['moderator', 'member'], undefined, { ...keys, TELEGRAM_BOT_TOKEN: 'bot', TELEGRAM_CHAT_ID: '42', DAILY_SPEND_RUPEES: '500' }, analytics.db)
})
afterAll(async () => {
  await t.close()
  await analytics.drop()
})
afterEach(() => { vi.unstubAllGlobals() })

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000)
const called = (role: string, model: string, outcome: string, ms: number, age: number, createdAt = minutesAgo(age)) => ({
  name: 'model_called', eventVersion: 1, actor: null, createdAt,
  fields: { role, model, tokensIn: 1000, cachedTokensIn: 0, tokensOut: 100, ms, fallback: model.startsWith('gemini'), outcome, session: null },
})
const routed = (band: string) => ({ name: 'turn_routed', eventVersion: 1, actor: null, createdAt: minutesAgo(30), fields: { band } })
const overview = async () => aiOverviewResponse.parse((await t.call('moderator', 'GET', '/v1/admin/ai')).json())
const homeCard = async () => adminHomeResponse.parse((await t.call('moderator', 'GET', '/v1/admin/home')).json()).cards.find((c) => c.subject === 'ai_pipeline')

describe('the AI pipeline of the admin', () => {
  it('gives the calls of today and of the last 15 minutes, the spend, the bands and the settings', async () => {
    await analytics.db.insert(events).values([
      called('router', 'deepseek-flash', 'ok', 100, 60), called('router', 'deepseek-flash', 'ok', 300, 60),
      called('extractor', 'deepseek-flash', 'failed', 10_000, 60), called('extractor', 'gemini-3.5-flash-lite', 'ok', 900, 60),
      called('composer', 'deepseek-flash', 'ok', 2000, 1), called('composer', 'deepseek-flash', 'invalid', 1500, 1),
      // Before the start of today in IST: the test app gives 2026-11-02 as today.
      called('router', 'deepseek-flash', 'failed', 60_000, 0, new Date('2026-11-01T23:00:00+05:30')),
      // The live check of the keys is no call of the assistant.
      called('check', 'gemini-3.5-flash-lite', 'ok', 500, 1),
      routed('core'), routed('core'), routed('sensitive'),
    ])
    await t.db.insert(modelSpend).values({ day: '2026-11-02', rupees: '84.5' })
    const ai = await overview()
    expect(ai.switch).toEqual({ geminiOnly: false, since: null, by: null })
    expect(ai.spend).toEqual({ today: 84.5, dailyAmount: 500 })
    expect(ai.numbers!.today).toEqual({ calls: 6, failedShare: 2 / 6, fallbackShare: 1 / 6, p95Ms: 10_000 })
    expect(ai.numbers!.lastQuarterHour).toEqual({ calls: 2, failedShare: 0.5, fallbackShare: 0 })
    expect(ai.numbers!.roles.map((r) => r.role).sort()).toEqual(['composer', 'extractor', 'router'])
    // 1,000 tokens in and 100 out at the prices of docs/model-selection.md: ₹0.03696 a DeepSeek call, ₹0.0484 a Gemini call.
    const extractor = ai.numbers!.roles.find((r) => r.role === 'extractor')!
    expect(extractor).toMatchObject({ calls: 2, failedShare: 0.5, fallbackShare: 0.5, p95Ms: 10_000 })
    expect(extractor.rupees).toBeCloseTo(0.03696 + 0.0484, 6)
    expect(ai.numbers!.bands).toEqual({ core: 2, general: 0, consequential: 0, out_of_scope: 0, adversarial: 0, sensitive: 1 })
    expect(ai.settings).toMatchObject({ models: { primary: 'deepseek-flash', fallback: 'gemini-3.5-flash-lite', timeoutMs: 10_000 }, spendAlertPercents: [70, 100], routerMinProbability: 0.8 })
    for (const [method, url] of [['GET', '/v1/admin/ai'], ['GET', '/v1/admin/ai/switch-log'], ['PUT', '/v1/admin/ai/switch']] as const) {
      expect((await t.call('member', method, url, method === 'PUT' ? { geminiOnly: true } : undefined)).statusCode).toBe(404)
    }
    expect(await homeCard()).toEqual({ subject: 'ai_pipeline', spendToday: 84.5, dailyAmount: 500, failedShare: 2 / 6, fallbackShare: 1 / 6, geminiOnly: false })
  })

  it('gives no numbers, and still the switch, when the analytics database refuses the connection', async () => {
    const down = createAnalyticsDb('postgres://x@127.0.0.1:1/none')
    const sources = { db: t.db, analyticsDb: down, spend: spendSettings.parse({}), assistant: assistantSettings.parse({}), limits: limitSettings.parse({}), today: () => '2026-11-02' }
    const log = { error: vi.fn() } as unknown as FastifyBaseLogger
    expect(await aiOverview(sources, log)).toMatchObject({ numbers: null, switch: { geminiOnly: false } })
    expect(await aiCard(sources, log)).toMatchObject({ failedShare: null, fallbackShare: null })
    expect(log.error).toHaveBeenCalledTimes(2)
    await down.$client.end()
  })

  it('gives no numbers when the analytics read takes over 5 seconds', async () => {
    vi.useFakeTimers()
    const log = { error: vi.fn() } as unknown as FastifyBaseLogger
    const read = bestEffort(() => new Promise<never>(() => {}), log, 'models.overview')
    await vi.advanceTimersByTimeAsync(5_000)
    expect(await read).toBeNull()
    expect(log.error).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('flips the switch for the next model call, logs the person and tells the team in Telegram', async () => {
    const telegram = fakeVendors({ gemini: [answer('{"intent":"room"}')] })
    const res = await t.call('moderator', 'PUT', '/v1/admin/ai/switch', { geminiOnly: true })
    expect(modelSwitchState.parse(res.json())).toMatchObject({ geminiOnly: true, by: 'moderator@example.com' })
    expect(telegram.telegram.map((r) => r.body.text)).toEqual(['roomsie: moderator@example.com switched all model calls to the fallback model, gemini-3.5-flash-lite.'])
    // The next model call reads the switch of this server.
    const { req } = fakeRequest()
    const live = { ...req, server: { ...req.server, geminiOnly: t.app.geminiOnly } } as FastifyRequest
    const models = modelSettings.parse(keys)!
    await models.json({ req: live, role: 'extractor', system: 'Fill the intent slot.', messages: [{ role: 'user', content: 'room' }], schema: z.object({ intent: z.string() }), session: null })
    expect(telegram.map((r) => r.url)).toEqual([gemini])
    expect(await homeCard()).toMatchObject({ geminiOnly: true })

    // A flip to the state of now adds no row and sends no message.
    await t.call('moderator', 'PUT', '/v1/admin/ai/switch', { geminiOnly: true })
    expect(telegram.telegram).toHaveLength(1)
    await t.call('moderator', 'PUT', '/v1/admin/ai/switch', { geminiOnly: false })
    expect(await t.app.geminiOnly()).toBe(false)
    const log = modelSwitchLogResponse.parse((await t.call('moderator', 'GET', '/v1/admin/ai/switch-log')).json())
    expect(log.flips.map((f) => [f.geminiOnly, f.by])).toEqual([[false, 'moderator@example.com'], [true, 'moderator@example.com']])
    await t.db.delete(modelSwitch).where(eq(modelSwitch.savedBy, t.ids.moderator))
  })
})
