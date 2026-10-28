import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ErrorEvent } from '@sentry/node'
import { privacyOptions } from '@roomsie/config/report'
import { offlineStorage } from '../scripts/openapi'
import { createAnalyticsDb } from '../src/analytics/client'
import { flushSentry, startSentry } from '../src/sentry'
import type { Storage } from '../src/storage'
import { testApp, type TestApp } from './app'

const reported: ErrorEvent[] = []
/** The events that Sentry sent since the last call. */
async function sent() {
  await flushSentry()
  return reported.splice(0)
}

/** The events as text, with no lines of source code: those show the text of this test too. */
const sourceLines = new Set(['pre_context', 'context_line', 'post_context'])
const textWithoutSource = (events: ErrorEvent[]) => JSON.stringify(events, (key, value: unknown) => (sourceLines.has(key) ? undefined : value))

// R2 refuses each upload link, with phone numbers in its message.
const failingStorage: Storage = { ...offlineStorage, uploadUrl: async () => { throw new Error('R2 refused the link of +91 98200 12345, 09820012345 and 982 001 2345') } }

let t: TestApp<'visitor' | 'friend'>
beforeAll(async () => {
  startSentry({
    dsn: 'https://public@o1.ingest.sentry.io/1',
    // Sentry keeps each event in memory, and nothing goes to the network.
    transport: () => ({
      send: async ([, items]) => {
        for (const [header, item] of items) if (header.type === 'event') reported.push(item as ErrorEvent)
        return {}
      },
      flush: async () => true,
    }),
  })
  // The analytics database is down, so each write of the events fails.
  t = await testApp(['visitor', 'friend'], failingStorage, {}, createAnalyticsDb('postgres://postgres@localhost:1/nowhere'))
  await t.liveCard('visitor')
})
afterAll(() => t.close())

describe('reportError', () => {
  it('reports a failed write of the events, with no values of the query', async () => {
    // The first sign-ins of the setup put "signed in" in memory.
    await t.flushEvents()
    const events = await sent()
    expect(events).toMatchObject([{ tags: { where: 'analytics' }, exception: { values: expect.arrayContaining([expect.objectContaining({ value: '2 analytics events lost' })]) } }])
    // The failed query names its values in its message, and they do not go out.
    const messages = events.flatMap((e) => e.exception?.values ?? []).map((v) => v.value).join('\n')
    expect(messages).toContain('params: [removed]')
    expect(messages).not.toContain('newAccount')
  })

  it('reports a best-effort failure with the person, and the route still succeeds', async () => {
    const friendCard = await t.liveCard('friend')
    t.realtime.down = true
    try {
      const res = await t.call('visitor', 'POST', '/v1/requests', { toProfileId: friendCard, note: 'Hi, call me on 98200 12345' })
      expect(res.statusCode).toBe(201)
    } finally {
      t.realtime.down = false
    }
    // The request also put "connect sent" in memory, and its write fails too.
    await t.flushEvents()
    const events = await sent()
    expect(events).toMatchObject([{ tags: { where: 'realtime' }, user: { id: t.ids.visitor } }, { tags: { where: 'analytics' } }])
    expect(textWithoutSource(events)).not.toMatch(/call me|98200/)
  })

  it('reports a failing route with the route and the person, and with no token, body or phone number', async () => {
    const res = await t.call('visitor', 'POST', '/v1/me/profile/upload-urls', { contentType: 'image/jpeg', size: 1000 })
    expect(res.statusCode).toBe(500)

    const events = await sent()
    expect(events).toMatchObject([{ tags: { where: 'POST /v1/me/profile/upload-urls' }, user: { id: t.ids.visitor } }])
    const text = textWithoutSource(events)
    expect(text).toContain('R2 refused the link of [phone], [phone] and [phone]')
    expect(text).not.toMatch(/98200|982 001|Bearer|image\/jpeg/)
  })

  it('removes the variables of the stack frames', async () => {
    const event: ErrorEvent = { type: undefined, exception: { values: [{ stacktrace: { frames: [{ function: 'send', vars: { note: 'call me' } }] } }] } }
    const scrubbed = await privacyOptions.beforeSend!(event, {})
    expect(scrubbed?.exception?.values?.[0]?.stacktrace?.frames).toEqual([{ function: 'send' }])
  })

  it('does not report a 4xx', async () => {
    expect((await t.call('visitor', 'POST', '/v1/me/profile/upload-urls', { contentType: 'image/gif', size: 1000 })).statusCode).toBe(400)
    expect((await t.call(null, 'GET', '/v1/me')).statusCode).toBe(401)
    expect((await t.call('visitor', 'GET', '/v1/nowhere')).statusCode).toBe(404)
    expect(await sent()).toEqual([])
  })
})
