import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { alertSettings, outgoingRequest, pushTokenStatus } from '@roomsie/contract'
import { connectionRequests, listings, messages, pushTokens, users } from '../src/db/schema'
import { testApp, type TestApp } from './app'

type Who = 'lister' | 'seeker' | 'friend' | 'stranger' | 'leaver'
let t: TestApp<Who>
const cards = {} as Record<'seeker' | 'friend', string>
beforeAll(async () => {
  t = await testApp(['lister', 'seeker', 'friend', 'stranger', 'leaver'])
  cards.seeker = await t.liveCard('seeker', 'Rahul Verma')
  cards.friend = await t.liveCard('friend', 'Divya Sharma')
})
afterAll(() => t.close())
beforeEach(async () => {
  await t.db.delete(connectionRequests)
  await t.db.delete(pushTokens)
  await t.db.update(users).set({ emailAlerts: true })
  await t.db.update(users).set({ status: 'active' }).where(eq(users.id, t.ids.friend))
  t.mails.length = 0
  t.pushes.length = 0
})

const sayHi = async (note = 'Hi Divya, call me on 98200 12345') => {
  const sent = await t.call('seeker', 'POST', '/v1/requests', { toProfileId: cards.friend, note })
  expect(sent.statusCode).toBe(201)
  return outgoingRequest.parse(sent.json()).id
}
/** Rahul says hi, Divya accepts, and the accept is older than the quiet time. */
async function chat() {
  const id = await sayHi()
  expect((await t.call('friend', 'POST', `/v1/requests/${id}/accept`)).statusCode).toBe(204)
  await t.db.update(connectionRequests).set({ respondedAt: minutesAgo(30), toReadAt: minutesAgo(30) }).where(eq(connectionRequests.id, id))
  t.mails.length = 0
  t.pushes.length = 0
  return id
}
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000)
const send = async (who: Who, id: string, text: string) => expect((await t.call(who, 'POST', `/v1/conversations/${id}/messages`, { id: uuidv7(), text })).statusCode).toBe(201)
const addToken = (who: Who, token: string) => t.call(who, 'POST', '/v1/me/push-tokens', { token })
const web = 'http://localhost:3000'

describe('the email of an account', () => {
  it('keeps the verified email of the sign-in, and the new one when it changes', async () => {
    const email = async () => (await t.db.select({ email: users.email }).from(users).where(eq(users.id, t.ids.stranger)))[0]!.email
    expect(await email()).toBe('stranger@example.com')
    const changed = await t.idToken('uid-stranger', { claims: { email: 'new@example.com', email_verified: true } })
    expect((await t.call('stranger', 'GET', '/v1/me', undefined, changed)).statusCode).toBe(200)
    expect(await email()).toBe('new@example.com')
    const unverified = await t.idToken('uid-stranger', { claims: { email: 'not-mine@example.com', email_verified: false } })
    await t.call('stranger', 'GET', '/v1/me', undefined, unverified)
    expect(await email()).toBe('new@example.com')
  })

  it('clears the email and the push tokens at a deletion', async () => {
    await addToken('leaver', 'leaver-browser')
    expect((await t.call('leaver', 'DELETE', '/v1/me')).statusCode).toBe(204)
    const [row] = await t.db.select({ email: users.email }).from(users).where(eq(users.id, t.ids.leaver))
    expect(row!.email).toBeNull()
    expect(await t.db.select().from(pushTokens).where(eq(pushTokens.userId, t.ids.leaver))).toEqual([])
  })
})

describe('the switches', () => {
  it('turns the email alerts off and on, for the account', async () => {
    expect(alertSettings.parse((await t.call('friend', 'GET', '/v1/me/alerts')).json())).toEqual({ emailAlerts: true })
    expect(alertSettings.parse((await t.call('friend', 'PUT', '/v1/me/alerts', { emailAlerts: false })).json())).toEqual({ emailAlerts: false })
    expect(alertSettings.parse((await t.call('friend', 'GET', '/v1/me/alerts')).json())).toEqual({ emailAlerts: false })
    expect(alertSettings.parse((await t.call('seeker', 'GET', '/v1/me/alerts')).json())).toEqual({ emailAlerts: true })
  })

  it('keeps the push token of a browser for one user, and removes it only for that user', async () => {
    expect((await addToken('friend', 'browser-1')).statusCode).toBe(204)
    expect((await addToken('friend', 'browser-1')).statusCode).toBe(204)
    // The same browser, now with a different person signed in.
    expect((await addToken('seeker', 'browser-1')).statusCode).toBe(204)
    const owners = async () => (await t.db.select({ userId: pushTokens.userId }).from(pushTokens)).map((r) => r.userId)
    expect(await owners()).toEqual([t.ids.seeker])
    const status = async (who: Who) => pushTokenStatus.parse((await t.call(who, 'POST', '/v1/me/push-tokens/status', { token: 'browser-1' })).json())
    expect(await status('seeker')).toEqual({ registered: true })
    expect(await status('friend')).toEqual({ registered: false })
    expect((await t.call('friend', 'DELETE', '/v1/me/push-tokens', { token: 'browser-1' })).statusCode).toBe(204)
    expect(await owners()).toEqual([t.ids.seeker])
    expect((await t.call('seeker', 'DELETE', '/v1/me/push-tokens', { token: 'browser-1' })).statusCode).toBe(204)
    expect(await owners()).toEqual([])
  })

  it('checks the bodies', async () => {
    expect((await t.call('friend', 'PUT', '/v1/me/alerts', { emailAlerts: 'no' })).statusCode).toBe(400)
    expect((await t.call('friend', 'POST', '/v1/me/push-tokens', { token: '' })).statusCode).toBe(400)
  })
})

describe('the alerts', () => {
  it('tells the recipient of a request by email and push, with no note', async () => {
    await addToken('friend', 'divya-phone')
    await addToken('friend', 'divya-laptop')
    await sayHi()
    expect(t.mails.map((m) => [m.to, m.subject])).toEqual([['friend@example.com', 'Rahul wants to say hi']])
    expect(t.mails[0]!.text).toContain(`${web}/messages/requests`)
    expect(t.mails[0]!.html).toContain(`${web}/messages/requests`)
    for (const part of [t.mails[0]!.text, t.mails[0]!.html]) expect(part).not.toMatch(/98200|Hi Divya|•/)
    expect(t.pushes).toHaveLength(2)
    expect(t.pushes).toEqual(expect.arrayContaining(['divya-phone', 'divya-laptop'].map((token) => ({ token, title: 'Rahul wants to say hi', link: `${web}/messages/requests` }))))
  })

  it('tells the sender of a request about the accept', async () => {
    await addToken('seeker', 'rahul-phone')
    const id = await sayHi()
    t.mails.length = 0
    t.pushes.length = 0
    await t.call('friend', 'POST', `/v1/requests/${id}/accept`)
    expect(t.mails.map((m) => [m.to, m.subject])).toEqual([['seeker@example.com', 'Divya accepted your request']])
    expect(t.pushes).toEqual([{ token: 'rahul-phone', title: 'Divya accepted your request', link: `${web}/messages/${id}` }])
  })

  it('sends nothing at a decline', async () => {
    const id = await sayHi()
    t.mails.length = 0
    await t.call('friend', 'POST', `/v1/requests/${id}/decline`)
    expect(t.mails).toEqual([])
  })

  it('tells about the first unread message of a chat only, with no text', async () => {
    const id = await chat()
    await send('friend', id, 'My number is 98200 12345')
    expect(t.mails.map((m) => [m.to, m.subject])).toEqual([['seeker@example.com', 'Divya sent you a message']])
    expect(t.mails[0]!.text).toContain(`${web}/messages/${id}`)
    expect(t.mails[0]!.text).not.toContain('98200')
    await send('friend', id, 'Are you there?')
    expect(t.mails).toHaveLength(1)
    // The two messages came 20 minutes ago, and Rahul read them 10 minutes ago: the next message is the first unread one again.
    await t.db.update(messages).set({ createdAt: minutesAgo(20) }).where(eq(messages.requestId, id))
    await t.db.update(connectionRequests).set({ fromReadAt: minutesAgo(10) }).where(eq(connectionRequests.id, id))
    await send('friend', id, 'Hello again')
    expect(t.mails).toHaveLength(2)
  })

  it('tells nothing while the person reads the chat, and again after 5 minutes away', async () => {
    const id = await chat()
    await t.db.update(connectionRequests).set({ fromReadAt: minutesAgo(1) }).where(eq(connectionRequests.id, id))
    await send('friend', id, 'Still there?')
    expect(t.mails).toEqual([])
    await t.db.delete(connectionRequests)
    const later = await chat()
    await t.db.update(connectionRequests).set({ fromReadAt: minutesAgo(6) }).where(eq(connectionRequests.id, later))
    await send('friend', later, 'Back?')
    expect(t.mails.map((m) => m.subject)).toEqual(['Divya sent you a message'])
  })

  it('counts the accept alert as the alert of the chat, for 5 minutes', async () => {
    const id = await sayHi()
    await t.call('friend', 'POST', `/v1/requests/${id}/accept`)
    t.mails.length = 0
    await send('friend', id, 'Hi Rahul!')
    expect(t.mails).toEqual([])
  })

  it('names a lister with no profile by the title of the listing', async () => {
    const listingId = await t.liveListing()
    await t.db.update(listings).set({ placeType: '2bhk' }).where(eq(listings.id, listingId))
    const sent = await t.call('seeker', 'POST', '/v1/requests', { listingId, note: 'Is it free?' })
    const id = outgoingRequest.parse(sent.json()).id
    t.mails.length = 0
    await t.call('lister', 'POST', `/v1/requests/${id}/accept`)
    expect(t.mails.map((m) => m.subject)).toEqual(['2 BHK, full flat accepted your request'])
  })

  it('obeys the switches, and tells no account that is not active', async () => {
    await addToken('friend', 'divya-phone')
    await t.call('friend', 'PUT', '/v1/me/alerts', { emailAlerts: false })
    await sayHi()
    expect(t.mails).toEqual([])
    expect(t.pushes.map((p) => p.token)).toEqual(['divya-phone'])
    await t.db.delete(connectionRequests)
    t.pushes.length = 0
    await t.db.update(users).set({ status: 'suspended' }).where(eq(users.id, t.ids.friend))
    await t.db.update(users).set({ emailAlerts: true }).where(eq(users.id, t.ids.friend))
    await t.call('seeker', 'POST', '/v1/requests', { toProfileId: cards.friend, note: 'Hi' })
    expect(t.mails).toEqual([])
    expect(t.pushes).toEqual([])
  })

  it('removes a push token that FCM refuses', async () => {
    await addToken('friend', 'gone-old-browser')
    await addToken('friend', 'divya-phone')
    await sayHi()
    expect(t.pushes.map((p) => p.token)).toEqual(['divya-phone'])
    expect((await t.db.select({ token: pushTokens.token }).from(pushTokens)).map((r) => r.token)).toEqual(['divya-phone'])
  })
})
