import { describe, expect, it } from 'vitest'
import type { Conversation, IncomingRequest, Message, OutgoingRequest } from '@roomsie/contract'
import { addMessage, badgeCount, chatWith, inboxItems, inboxTime, listingChat, messageListerLabel, otherName, threadDays } from './messages'

const id = (n: number) => `0199e4b0-0000-7000-8000-${String(n).padStart(12, '0')}`
const person = (name: string | null, deleted = false) => ({ profileId: name ? id(90) : null, name, photoUrl: null, deleted })
const message = (n: number, createdAt: string, mine = false): Message => ({ id: id(n), conversationId: id(1), mine, text: `m${n}`, createdAt })
const conversation = (n: number, patch: Partial<Conversation> = {}): Conversation => ({
  id: id(n), other: person(`Person ${n}`), listingId: null, lastMessage: null, unread: 0, canSend: true, ...patch,
})
const sent = (n: number, patch: Partial<OutgoingRequest> = {}): OutgoingRequest => ({
  id: id(n), toProfileId: id(90), listingId: null, to: person(`Sent ${n}`), note: 'Hi', state: 'open', createdAt: '2026-10-27T05:00:00.000Z', ...patch,
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
    expect(items.map((i) => (i.kind === 'conversation' ? `c${i.conversation.id.slice(-1)}` : `r${i.request.id.slice(-1)}`))).toEqual(['r3', 'c1', 'r5', 'c2'])
  })

  it('gives the time of today, "Yesterday", the day of this week, or the date, in India time', () => {
    const now = new Date('2026-10-27T12:00:00.000Z')
    expect(inboxTime('2026-10-27T09:11:00.000Z', now)).toBe('2:41pm')
    expect(inboxTime('2026-10-26T09:00:00.000Z', now)).toBe('Yesterday')
    expect(inboxTime('2026-10-23T09:00:00.000Z', now)).toBe('Fri')
    expect(inboxTime('2026-10-01T09:00:00.000Z', now)).toBe('1 Oct 26')
  })

  it('names a deleted account "Deleted user"', () => {
    expect(otherName(person('Divya Trivedi'))).toBe('Divya Trivedi')
    expect(otherName(person(null, true))).toBe('Deleted user')
    expect(otherName(person(null))).toBeNull()
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

  it('names the lister of each kind of listing', () => {
    expect(messageListerLabel('pg')).toBe('Message the PG/Hostel')
    expect(messageListerLabel('broker_flat')).toBe('Message the broker')
    expect(messageListerLabel('owner_flat')).toBe('Message the owner')
    expect(messageListerLabel('room_in_flat')).toBe('Message the flatmate')
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
