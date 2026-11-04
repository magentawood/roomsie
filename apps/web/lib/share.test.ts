import { describe, expect, it } from 'vitest'
import { cardLinks, cardUrl, shareText } from './share'

const place = 'https://roomsie.in/places/019a4b2c-0000-7000-8000-000000000001'

describe('a shared card in a thread (T-50)', () => {
  it('writes the title and the roomsie.in link of the card', () => {
    expect(shareText('Private room in 3BHK', cardUrl({ kind: 'places', id: '019a4b2c-0000-7000-8000-000000000001' }))).toBe(`Private room in 3BHK: ${place}`)
  })

  it('makes only a link to a place or a person of roomsie.in tappable', () => {
    expect(cardLinks(`Private room in 3BHK: ${place}`)).toEqual([
      'Private room in 3BHK: ',
      { href: '/places/019a4b2c-0000-7000-8000-000000000001', text: place },
    ])
    expect(cardLinks('See https://roomsie.in/people/019a4b2c-0000-7000-8000-000000000002, she is nice')).toEqual([
      'See ', { href: '/people/019a4b2c-0000-7000-8000-000000000002', text: 'https://roomsie.in/people/019a4b2c-0000-7000-8000-000000000002' }, ', she is nice',
    ])
  })

  it('keeps each other link as plain text, so no outside link can mislead', () => {
    for (const text of ['Pay at https://roomsie.in.evil.com/places/019a4b2c-0000-7000-8000-000000000001', 'https://evil.com/places/x', 'https://roomsie.in/admin', 'no link at all']) {
      expect(cardLinks(text)).toEqual([text])
    }
  })
})
