import { describe, expect, it } from 'vitest'
import type { Conversation, IncomingRequest, Message, OutgoingRequest } from '@roomsie/contract'
import { addMessage, badgeCount, chatWith, inboxItems, inboxTime, listingChat, requestTimes, threadDays } from './messages'

const id = (n: number) => `0199e4b0-0000-7000-8000-${String(n).padStart(12, '0')}`
const person = (name: string | null, deleted = false, profileId = name ? id(90) : null) => ({ profileId, name, photoUrl: null, deleted })
const message = (n: number, createdAt: string, mine = false): Message => ({ id: id(n), conversationId: id(1), mine, text: `m${n}`, createdAt })
const conversation = (n: number, patch: Partial<Conversation> = {}): Conversation => ({
  id: id(n), other: person(`Person ${n}`, false, id(100 + n)), listingId: null, lastMessage: null, unread: 0, canSend: true, ...patch,
})
const sent = (n: number, patch: Partial<OutgoingRequest> = {}): OutgoingRequest => ({
  id: id(n), toProfileId: id(100 + n), listingId: null, to: person(`Sent ${n}`, false, id(100 + n)), note: 'Hi', state: 'open', createdAt: '2026-10-27T05:00:00.000Z', ...patch,
})
const incoming = { id: id(70) } as IncomingRequest

describe('the badge of Messages', () => {
  it('counts the unread messages and the open requests to the user', () => {
    expect(badgeCount([conversation(1, { unread: 3 }), conversation(2)], [incoming, incoming])).toBe(5)
    expect(badgeCount([], [])).toBe(0)
  })
})

describe('the inbox', () => {
  it('lists the conversations and the sent requests that wait or are not available, the newest first', () => {
    const items = inboxItems(
      [conversation(1, { lastMessage: message(11, '2026-10-27T09:00:00.000Z') }), conversation(2, { lastMessage: null })],
      [sent(3, { createdAt: '2026-10-27T10:00:00.000Z' }), sent(4, { state: 'accepted' }), sent(5, { state: 'not_available', createdAt: '2026-10-26T10:00:00.000Z' })],
    )
    expect(items.map((i) => (i.kind === 'conversation' ? `c${i.id.slice(-1)}` : `r${i.id.slice(-1)}`))).toEqual(['r3', 'c1', 'r5', 'c2'])
  })

  it('shows each recipient once: the chat, or else the newest request', () => {
    const divya = person('Divya', false, id(201))
    const listing = { listingId: id(50), toProfileId: null, to: person(null) }
    const items = inboxItems(
      [conversation(1, { other: divya })],
      [sent(2, { to: divya, toProfileId: divya.profileId, state: 'not_available' }), sent(3, { ...listing, createdAt: '2026-10-27T06:00:00.000Z' }), sent(4, { ...listing, state: 'not_available' })],
    )
    expect(items.map((i) => i.id)).toEqual([id(3), id(1)])
  })

  it('gives the time of today, "Yesterday", the day of this week, or the date, in India time', () => {
    const now = new Date('2026-10-27T12:00:00.000Z')
    expect(inboxTime('2026-10-27T09:11:00.000Z', now)).toBe('2:41pm')
    expect(inboxTime('2026-10-26T09:00:00.000Z', now)).toBe('Yesterday')
    expect(inboxTime('2026-10-23T09:00:00.000Z', now)).toBe('Fri')
    expect(inboxTime('2026-10-01T09:00:00.000Z', now)).toBe('1 Oct 26')
  })
})

describe('the requests to the user', () => {
  it('tells when a request came and when it closes, in India days', () => {
    const now = new Date('2026-10-27T12:00:00.000Z')
    expect(requestTimes('2026-10-27T05:00:00.000Z', '2026-11-10T05:00:00.000Z', now)).toBe('Sent today · Closes in 14 days')
    expect(requestTimes('2026-10-24T05:00:00.000Z', '2026-11-07T05:00:00.000Z', now)).toBe('Sent 3 days ago · Closes in 11 days')
    expect(requestTimes('2026-10-14T05:00:00.000Z', '2026-10-28T05:00:00.000Z', now)).toBe('Sent 13 days ago · Closes tomorrow')
    expect(requestTimes('2026-10-13T13:00:00.000Z', '2026-10-27T13:00:00.000Z', now)).toBe('Sent 14 days ago · Closes today')
  })
})

describe('the message buttons', () => {
  it('gives the state of a listing from the newest request to it, and the chat after an accept', () => {
    const listingId = id(50)
    const chat = conversation(8, { listingId })
    expect(listingChat([], [chat], listingId)).toEqual({ state: 'none' })
    expect(listingChat([sent(1, { listingId })], [], listingId)).toEqual({ state: 'sent' })
    expect(listingChat([sent(1, { listingId, state: 'not_available' })], [], listingId)).toEqual({ state: 'not_available' })
    expect(listingChat([sent(1, { listingId, state: 'accepted' })], [chat], listingId)).toEqual({ state: 'accepted', conversationId: chat.id })
  })

  it('finds the chat with a person', () => {
    const chat = conversation(8, { other: person('Divya') })
    expect(chatWith([conversation(7, { other: person(null) }), chat], id(90))).toBe(chat.id)
    expect(chatWith([], id(90))).toBeUndefined()
  })
})

describe('the thread', () => {
  it('puts a new message on top of the newest page one time, and leaves an unloaded thread alone', () => {
    const pages = { pages: [{ messages: [message(1, '2026-10-27T03:00:00.000Z')], hasMore: false }], pageParams: [undefined] }
    const added = addMessage(pages, message(2, '2026-10-27T04:00:00.000Z'))
    expect(added!.pages[0]!.messages.map((m) => m.text)).toEqual(['m2', 'm1'])
    expect(addMessage(added, message(2, '2026-10-27T04:00:00.000Z'))).toBe(added)
    expect(addMessage(undefined, message(2, '2026-10-27T04:00:00.000Z'))).toBeUndefined()
  })

  it('shows the pages oldest first, by day in India time', () => {
    const now = new Date('2026-10-27T12:00:00.000Z')
    const newestFirst = [message(4, '2026-10-27T03:00:00.000Z'), message(3, '2026-10-26T20:00:00.000Z'), message(2, '2026-10-26T10:00:00.000Z'), message(1, '2026-10-20T10:00:00.000Z')]
    expect(threadDays(newestFirst, now).map((d) => [d.label, d.messages.map((m) => m.text)])).toEqual([
      ['20 Oct 26', ['m1']],
      ['Yesterday', ['m2']],
      ['Today', ['m3', 'm4']],
    ])
  })
})
