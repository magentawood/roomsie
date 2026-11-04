import { describe, expect, it } from 'vitest'
import { adminHomeView } from './moderation'

const site = { subject: 'site_content', invites: 1, inviteOnly: false, quotes: 0, detailsSet: 0 }

describe('the admin home of the web', () => {
  it('drops a card of an unknown subject', () => {
    expect(adminHomeView.parse({ cards: [{ subject: 'people', people: 412 }, site] }).cards.map((c) => c.subject)).toEqual(['site_content'])
  })

  it('fails on a known card with a wrong field', () => {
    expect(() => adminHomeView.parse({ cards: [{ ...site, quotes: 'two' }] })).toThrow()
  })
})
