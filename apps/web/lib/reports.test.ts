import { describe, expect, it } from 'vitest'
import type { Conversation, OutgoingRequest, ReportQueueItem } from '@roomsie/contract'
import { ago, joinsLister, summary } from './reports'

const now = new Date('2026-10-26T12:00:00Z')
const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString()
const report = (minutesAgo: number) => ({ id: '0199e4b0-0000-7000-8000-000000000001', reason: 'fake' as const, safety: false, detail: null, createdAt: at(minutesAgo) })

describe('the age of a report', () => {
  it('gives minutes, hours or days', () => {
    expect(ago(at(0), now)).toBe('just now')
    expect(ago(at(20), now)).toBe('20 min ago')
    expect(ago(at(180), now)).toBe('3 h ago')
    expect(ago(at(24 * 60), now)).toBe('1 day ago')
    expect(ago(at(3 * 24 * 60), now)).toBe('3 days ago')
  })
})

describe('the summary of a queue item', () => {
  it('counts the reports and gives the age of the first', () => {
    const item: ReportQueueItem = { kind: 'person', userId: '0199e4b0-0000-7000-8000-000000000002', card: null, hiddenForReview: true, reports: [report(180), report(60)] }
    expect(summary(item, now)).toBe('2 reports · first 3 h ago')
    expect(summary({ ...item, reports: [report(120)] }, now)).toBe('1 report · 2 h ago')
  })
})

describe('"Not interested" in the report modal', () => {
  it('shows on a listing only when a chat or an open request joins the user and its lister', () => {
    const listingId = '0199e4b0-0000-7000-8000-000000000010'
    const to = { profileId: null, name: null, photoUrl: null, deleted: false }
    const request = (state: OutgoingRequest['state']): OutgoingRequest => ({
      id: '0199e4b0-0000-7000-8000-000000000011', toProfileId: null, listingId, to, note: 'Hi', state, createdAt: at(10),
    })
    const chat: Conversation = { id: '0199e4b0-0000-7000-8000-000000000011', other: to, listingId, lastMessage: null, unread: 0, canSend: true }
    expect(joinsLister([], [], listingId)).toBe(false)
    expect(joinsLister([request('open')], [], listingId)).toBe(true)
    expect(joinsLister([request('accepted')], [chat], listingId)).toBe(true)
    expect(joinsLister([request('not_available')], [], listingId)).toBe(false)
    expect(joinsLister([request('open')], [], '0199e4b0-0000-7000-8000-000000000012')).toBe(false)
  })
})
