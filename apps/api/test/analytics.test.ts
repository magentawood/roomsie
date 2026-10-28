import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { asc, eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { outgoingRequest } from '@roomsie/contract'
import { createAnalyticsDb } from '../src/analytics/client'
import { events } from '../src/analytics/schema'
import { connectionRequests, users } from '../src/db/schema'
import { testApp, type TestApp } from './app'
import { createTestAnalyticsDb } from './db'

type Who = 'seeker' | 'friend' | 'leaver'
let t: TestApp<Who>
let analytics: Awaited<ReturnType<typeof createTestAnalyticsDb>>
const cards = {} as Record<'seeker' | 'friend', string>
beforeAll(async () => {
  analytics = await createTestAnalyticsDb()
  t = await testApp(['seeker', 'friend', 'leaver'], undefined, {}, analytics.db)
  cards.seeker = await t.liveCard('seeker', 'Rahul Verma')
  cards.friend = await t.liveCard('friend', 'Divya Sharma')
})
afterAll(async () => {
  await t.close()
  await analytics.drop()
})
beforeEach(async () => {
  // A pair with an accepted request cannot send a new one.
  await t.db.delete(connectionRequests)
  await t.flushEvents()
  await analytics.db.delete(events)
})

async function written() {
  await t.flushEvents()
  return analytics.db.select().from(events).orderBy(asc(events.createdAt))
}
const actorOf = async (who: Who) => (await t.db.select({ id: users.analyticsId }).from(users).where(eq(users.id, t.ids[who])))[0]!.id

describe('track', () => {
  it('fires "connect sent" and "connect accepted" with the analytics id of each person, and no text', async () => {
    const sent = await t.call('seeker', 'POST', '/v1/requests', { toProfileId: cards.friend, note: 'Hi Divya, call me on 98200 12345' })
    const { id } = outgoingRequest.parse(sent.json())
    expect((await t.call('friend', 'POST', `/v1/requests/${id}/accept`)).statusCode).toBe(204)

    const rows = await written()
    expect(rows).toMatchObject([
      { name: 'connect_sent', eventVersion: 1, actor: await actorOf('seeker'), fields: { to: 'person' } },
      { name: 'connect_accepted', eventVersion: 1, actor: await actorOf('friend'), fields: { to: 'person' } },
    ])
    expect(JSON.stringify(rows)).not.toContain('98200')
  })

  it('names a listing as the target of a request, an accept and a report', async () => {
    const listingId = await t.liveListing()
    const sent = await t.call('friend', 'POST', '/v1/requests', { listingId, note: 'Is it free?' })
    const { id } = outgoingRequest.parse(sent.json())
    expect((await t.call('seeker', 'POST', `/v1/requests/${id}/accept`)).statusCode).toBe(204)
    expect((await t.call('friend', 'POST', '/v1/reports', { id: uuidv7(), listingId, reason: 'broker_or_spam' })).statusCode).toBe(204)

    expect(await written()).toMatchObject([
      { name: 'connect_sent', fields: { to: 'listing' } },
      { name: 'connect_accepted', fields: { to: 'listing' } },
      { name: 'report_filed', fields: { subject: 'listing', reason: 'broker_or_spam' } },
    ])
  })

  it('fires "report filed" with the subject and the reason, not the detail, and one time for a repeated tap', async () => {
    const detail = 'He asked for money first'
    const report = { id: uuidv7(), profileId: cards.friend, reason: 'fake', detail }
    expect((await t.call('seeker', 'POST', '/v1/reports', report)).statusCode).toBe(204)
    expect((await t.call('seeker', 'POST', '/v1/reports', report)).statusCode).toBe(204)

    const rows = await written()
    expect(rows).toMatchObject([{ name: 'report_filed', actor: await actorOf('seeker'), fields: { subject: 'person', reason: 'fake' } }])
    expect(JSON.stringify(rows)).not.toContain(detail)
  })

  it('fires "signed in" one time for each sign-in, not for a refreshed token', async () => {
    const now = Math.floor(Date.now() / 1000)
    const later = await t.idToken('uid-seeker', { authTime: now + 1 })
    // Two requests at the same time with a new sign-in fire one event.
    await Promise.all([t.call('seeker', 'GET', '/v1/me', undefined, later), t.call('seeker', 'GET', '/v1/me', undefined, later)])
    // A refresh keeps auth_time.
    await t.call('seeker', 'GET', '/v1/me', undefined, await t.idToken('uid-seeker', { authTime: now + 1, iat: now + 2 }))

    expect(await written()).toMatchObject([{ name: 'signed_in', actor: await actorOf('seeker'), fields: { newAccount: false } }])
  })

  it('fires "signed in" as a new account at the first sign-in', async () => {
    await t.call('seeker', 'GET', '/v1/me', undefined, await t.idToken('uid-newcomer'))
    const [newcomer] = await t.db.select({ analyticsId: users.analyticsId }).from(users).where(eq(users.authProviderId, 'uid-newcomer'))

    expect(await written()).toMatchObject([{ name: 'signed_in', actor: newcomer!.analyticsId, fields: { newAccount: true } }])
  })

  it('removes the link between a deleted account and its events', async () => {
    const actor = await actorOf('leaver')
    expect(actor).toBeTruthy()
    expect((await t.call('leaver', 'DELETE', '/v1/me')).statusCode).toBe(204)
    const [tombstone] = await t.db.select().from(users).where(eq(users.id, t.ids.leaver))
    expect(tombstone).toMatchObject({ analyticsId: null, lastSignInAt: null })

    // A rejoin is a new account with a new analytics id.
    await t.call('leaver', 'GET', '/v1/me', undefined, await t.idToken('uid-leaver', { authTime: Math.floor(Date.now() / 1000) + 1 }))
    const [event] = await written()
    expect(event).toMatchObject({ name: 'signed_in', fields: { newAccount: true } })
    expect(event!.actor).not.toBe(actor)
  })

  it('keeps the route working when a write of the events fails', async () => {
    const app = await testApp(['visitor'], undefined, {}, createAnalyticsDb('postgres://postgres@localhost:1/nowhere'))
    try {
      expect((await app.call('visitor', 'GET', '/v1/me')).statusCode).toBe(200)
      await expect(app.flushEvents()).resolves.toBeUndefined()
    } finally {
      await app.close()
    }
  })
})
