import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { conversationsResponse, message, messagesResponse, outgoingRequest, realtimeResponse } from '@roomsie/contract'
import { blocks, connectionRequests, messages, users } from '../src/db/schema'
import { testApp, type TestApp } from './app'

type Who = 'lister' | 'seeker' | 'friend' | 'stranger'
let t: TestApp<Who>
const cards = {} as Record<'seeker' | 'friend', string>
beforeAll(async () => {
  t = await testApp(['lister', 'seeker', 'friend', 'stranger'])
  cards.seeker = await t.liveCard('seeker', 'Rahul Verma')
  cards.friend = await t.liveCard('friend', 'Divya Sharma')
})
afterAll(() => t.close())
beforeEach(async () => {
  await t.db.delete(connectionRequests)
  await t.db.delete(blocks)
  t.sent.length = 0
})

const list = async (who: Who) => conversationsResponse.parse((await t.call(who, 'GET', '/v1/conversations')).json()).conversations
const thread = async (who: Who, id: string, before?: string) =>
  messagesResponse.parse((await t.call(who, 'GET', `/v1/conversations/${id}/messages${before ? `?before=${before}` : ''}`)).json())
const send = (who: Who, id: string, text: string, messageId = uuidv7()) => t.call(who, 'POST', `/v1/conversations/${id}/messages`, { id: messageId, text })
/** Rahul says hi to Divya, and Divya accepts. Gives the id of the conversation. */
async function connect(note = 'Hi Divya, I work in BKC.') {
  const sent = await t.call('seeker', 'POST', '/v1/requests', { toProfileId: cards.friend, note })
  expect(sent.statusCode).toBe(201)
  const { id } = outgoingRequest.parse(sent.json())
  expect((await t.call('friend', 'POST', `/v1/requests/${id}/accept`)).statusCode).toBe(204)
  return id
}

describe('a conversation', () => {
  it('opens at the accept, with the note as the first message of its sender, live to both', async () => {
    const id = await connect()
    const [mine] = await list('seeker')
    expect(mine).toMatchObject({ id, other: { profileId: cards.friend, name: 'Divya Sharma', deleted: false }, listingId: null, unread: 0, canSend: true, lastMessage: { text: 'Hi Divya, I work in BKC.', mine: true } })
    // Divya read the note to accept it.
    expect((await list('friend'))[0]).toMatchObject({ id, other: { profileId: cards.seeker, name: 'Rahul Verma' }, unread: 0, lastMessage: { mine: false } })
    expect((await thread('friend', id)).messages).toMatchObject([{ conversationId: id, text: 'Hi Divya, I work in BKC.', mine: false }])
    expect(t.sent.map((s) => [s.userId, s.event])).toEqual(expect.arrayContaining([[t.ids.seeker, 'message'], [t.ids.friend, 'message']]))
  })

  it('sends a masked message, live to both people, and a retried send stores one message', async () => {
    const id = await connect()
    t.sent.length = 0
    const messageId = uuidv7()
    const first = await send('friend', id, 'Sure! Call me on 98200 12345.', messageId)
    expect(first.statusCode).toBe(201)
    expect(message.parse(first.json())).toMatchObject({ id: messageId, mine: true })
    expect(first.json().text).not.toContain('98200')
    expect((await send('friend', id, 'Sure! Call me on 98200 12345.', messageId)).statusCode).toBe(201)
    expect(await t.db.select().from(messages).where(eq(messages.id, messageId))).toHaveLength(1)
    expect(t.sent).toEqual([
      { userId: t.ids.friend, event: 'message', payload: expect.objectContaining({ id: messageId, mine: true }) },
      { userId: t.ids.seeker, event: 'message', payload: expect.objectContaining({ id: messageId, mine: false }) },
    ])
    expect((await send('friend', id, '   ')).statusCode).toBe(400)
    expect((await send('friend', id, 'x'.repeat(2001))).statusCode).toBe(400)
  })

  it('gives nothing to a person who is not in it, and an open request has no thread', async () => {
    const id = await connect()
    expect((await t.call('stranger', 'GET', `/v1/conversations/${id}/messages`)).statusCode).toBe(404)
    expect((await send('stranger', id, 'Hi')).statusCode).toBe(404)
    expect(await list('stranger')).toEqual([])
    const open = outgoingRequest.parse((await t.call('friend', 'POST', '/v1/requests', { listingId: await t.liveListing(), note: 'Is it free?' })).json()).id
    expect((await t.call('friend', 'GET', `/v1/conversations/${open}/messages`)).statusCode).toBe(404)
    expect((await send('lister', open, 'Hi')).statusCode).toBe(404)
    expect((await t.call(null, 'GET', '/v1/conversations')).statusCode).toBe(401)
  })

  it('counts the unread messages until the person reads the conversation', async () => {
    const id = await connect()
    await send('seeker', id, 'Are you free on Sunday?')
    await send('seeker', id, 'Or after work?')
    expect((await list('friend'))[0]!.unread).toBe(2)
    expect((await t.call('friend', 'POST', `/v1/conversations/${id}/read`)).statusCode).toBe(204)
    expect((await list('friend'))[0]!.unread).toBe(0)
    await send('seeker', id, 'Or Saturday?')
    expect((await list('friend'))[0]!.unread).toBe(1)
    expect((await list('seeker'))[0]!.unread).toBe(0)
  })

  it('gives the messages in pages, the newest first, and loses no message at a tie of times on the edge of a page', async () => {
    const id = await connect()
    // After the note, which has the time of the request.
    const start = Date.now() + 60_000
    // m9 has the time of m10, the last message of the first page.
    await t.db.insert(messages).values(Array.from({ length: 60 }, (_, i) => ({ requestId: id, senderUserId: t.ids.seeker, text: `m${i}`, createdAt: new Date(start + (i === 9 ? 10 : i) * 1000) })))
    const first = await thread('friend', id)
    expect(first.messages).toHaveLength(50)
    expect(first.messages[0]!.text).toBe('m59')
    expect(first.hasMore).toBe(true)
    const second = await thread('friend', id, first.messages.at(-1)!.id)
    expect(second.messages.map((m) => m.text)).toEqual(['m9', 'm8', 'm7', 'm6', 'm5', 'm4', 'm3', 'm2', 'm1', 'm0', 'Hi Divya, I work in BKC.'])
    expect(second.hasMore).toBe(false)
  })

  it('a block hides the thread from the two people, and neither can send', async () => {
    const id = await connect()
    await t.db.insert(blocks).values({ blockerUserId: t.ids.friend, blockedUserId: t.ids.seeker })
    for (const who of ['seeker', 'friend'] as const) {
      expect(await list(who)).toEqual([])
      expect((await t.call(who, 'GET', `/v1/conversations/${id}/messages`)).statusCode).toBe(404)
      expect((await send(who, id, 'Hi')).statusCode).toBe(404)
    }
  })

  it('a suspended account gets no message, and the thread stays for the other person', async () => {
    const id = await connect()
    await t.db.update(users).set({ status: 'suspended' }).where(eq(users.id, t.ids.friend))
    expect((await list('seeker'))[0]).toMatchObject({ id, canSend: false })
    expect((await thread('seeker', id)).messages).toHaveLength(1)
    expect((await send('seeker', id, 'Hello?')).statusCode).toBe(409)
    await t.db.update(users).set({ status: 'active' }).where(eq(users.id, t.ids.friend))
  })

  it('goes through a listing to an owner with no profile', async () => {
    const listingId = await t.liveListing()
    const sent = await t.call('seeker', 'POST', '/v1/requests', { listingId, note: 'Is the room free?' })
    expect((await t.call('lister', 'POST', `/v1/requests/${outgoingRequest.parse(sent.json()).id}/accept`)).statusCode).toBe(204)
    expect((await list('seeker'))[0]).toMatchObject({ listingId, other: { profileId: null, name: null, deleted: false }, canSend: true })
    expect((await list('lister'))[0]).toMatchObject({ listingId, other: { profileId: cards.seeker, name: 'Rahul Verma' } })
  })
})

describe('a deleted account', () => {
  it('leaves the thread to the other person, who sees "Deleted user" and cannot answer', async () => {
    const card = await t.liveCard('stranger', 'Karan Shah')
    const sent = await t.call('seeker', 'POST', '/v1/requests', { toProfileId: card, note: 'Hi Karan' })
    const { id } = outgoingRequest.parse(sent.json())
    expect((await t.call('stranger', 'POST', `/v1/requests/${id}/accept`)).statusCode).toBe(204)
    await send('stranger', id, 'Hello!')
    expect((await t.call('stranger', 'DELETE', '/v1/me')).statusCode).toBe(204)
    expect((await list('seeker'))[0]).toMatchObject({ id, other: { profileId: null, name: null, photoUrl: null, deleted: true }, canSend: false })
    expect((await thread('seeker', id)).messages.map((m) => m.text)).toEqual(['Hello!', 'Hi Karan'])
    expect((await send('seeker', id, 'Are you there?')).statusCode).toBe(409)
  })
})

describe('the realtime channel', () => {
  it('gives the channel and the public settings, and adds the claims to the token one time', async () => {
    const first = realtimeResponse.parse((await t.call('seeker', 'POST', '/v1/me/realtime')).json())
    expect(first).toEqual({ url: 'https://realtime.example.com', key: 'test-anon-key', channel: `user:${t.ids.seeker}`, mustRefreshIdToken: true })
    expect(t.claims).toEqual([{ uid: 'uid-seeker', claims: { role: 'authenticated', roomsie_user_id: t.ids.seeker } }])
    const token = await t.idToken('uid-seeker', { claims: { role: 'authenticated', roomsie_user_id: t.ids.seeker } })
    const again = realtimeResponse.parse((await t.call('seeker', 'POST', '/v1/me/realtime', undefined, token)).json())
    expect(again.mustRefreshIdToken).toBe(false)
    expect(t.claims).toHaveLength(1)
  })
})
