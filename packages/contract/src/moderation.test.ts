import { describe, expect, it } from 'vitest'
import { adminHomeView, adminPersonView } from './moderation'

const site = { subject: 'site_content', invites: 1, inviteOnly: false, quotes: 0, detailsSet: 0 }

describe('the admin home of the web', () => {
  it('drops a card of an unknown subject', () => {
    expect(adminHomeView.parse({ cards: [{ subject: 'people', people: 412 }, site] }).cards.map((c) => c.subject)).toEqual(['site_content'])
  })

  it('fails on a known card with a wrong field', () => {
    expect(() => adminHomeView.parse({ cards: [{ ...site, quotes: 'two' }] })).toThrow()
  })
})

describe('the person of the admin, on the web', () => {
  const at = '2026-11-05T10:00:00.000Z'
  const person = {
    userId: '0199e4b0-0000-7000-8000-000000000001', name: null, email: null, photoUrl: null, joinedAt: at, lastActiveAt: null, openReports: 0,
    hidden: false, suspended: false, verified: false, card: null, visibility: null,
  }
  const row = (action: string) => ({ id: '0199e4b0-0000-7000-8000-000000000002', action, listingId: null, by: null, at })

  it('drops a row of the log with an unknown action, and a report with an unknown reason', () => {
    const report = (reason: string) => ({ id: '0199e4b0-0000-7000-8000-000000000003', reason, detail: null, status: 'open', createdAt: at })
    const parsed = adminPersonView.parse({ ...person, log: [row('unsuspend'), row('hide')], reports: [report('scam'), report('fake')] })
    expect([parsed.log.map((l) => l.action), parsed.reports.map((r) => r.reason)]).toEqual([['hide'], ['fake']])
  })
})
