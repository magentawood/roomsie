import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ErrorEvent } from '@sentry/core'
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

// R2 refuses each upload link, with a phone number in its message.
const failingStorage: Storage = { ...offlineStorage, uploadUrl: async () => { throw new Error('R2 refused the link of +91 98200 12345') } }

let t: TestApp<'visitor'>
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
  t = await testApp(['visitor'], failingStorage, {}, createAnalyticsDb('postgres://postgres@localhost:1/nowhere'))
})
afterAll(() => t.close())

describe('reportError', () => {
  it('reports a best-effort failure, and the route still succeeds', async () => {
    // The first sign-in of the setup put "signed in" in memory.
    await t.flushEvents()
    const events = await sent()
    expect(events).toMatchObject([{ tags: { where: 'analytics' } }])
    // The failed query names its values in its message, and they do not go out.
    const messages = events.flatMap((e) => e.exception?.values ?? []).map((v) => v.value).join('\n')
    expect(messages).toContain('params: [removed]')
    expect(messages).not.toContain('newAccount')
  })

  it('reports a failing route with the route and the person, and with no token, body or phone number', async () => {
    await t.liveCard('visitor')
    const res = await t.call('visitor', 'POST', '/v1/me/profile/upload-urls', { contentType: 'image/jpeg', size: 1000 })
    expect(res.statusCode).toBe(500)

    const events = await sent()
    expect(events).toMatchObject([{ tags: { where: 'POST /v1/me/profile/upload-urls' }, user: { id: t.ids.visitor } }])
    const text = JSON.stringify(events)
    expect(text).toContain('R2 refused the link of [phone]')
    expect(text).not.toMatch(/98200|Bearer|image\/jpeg/)
  })

  it('does not report a 4xx', async () => {
    expect((await t.call('visitor', 'POST', '/v1/me/profile/upload-urls', { contentType: 'image/gif', size: 1000 })).statusCode).toBe(400)
    expect((await t.call(null, 'GET', '/v1/me')).statusCode).toBe(401)
    expect((await t.call('visitor', 'GET', '/v1/nowhere')).statusCode).toBe(404)
    expect(await sent()).toEqual([])
  })
})
