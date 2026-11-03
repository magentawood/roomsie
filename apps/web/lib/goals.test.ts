import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { cardLinks, deployRefusal, shareText } from './goals'

const origin = 'https://roomsie.in'
const place = 'https://roomsie.in/places/019a4b2c-0000-7000-8000-000000000001'

describe('a shared card in a thread (T-50)', () => {
  it('writes the title and the link of the card', () => {
    expect(shareText('Private room in 3BHK', place)).toBe(`Private room in 3BHK: ${place}`)
  })

  it('makes only a link to a place or a person of the site tappable', () => {
    expect(cardLinks(`Private room in 3BHK: ${place}`, origin)).toEqual([
      'Private room in 3BHK: ',
      { href: '/places/019a4b2c-0000-7000-8000-000000000001', text: place },
    ])
    expect(cardLinks('See https://roomsie.in/people/019a4b2c-0000-7000-8000-000000000002, she is nice', origin)).toEqual([
      'See ', { href: '/people/019a4b2c-0000-7000-8000-000000000002', text: 'https://roomsie.in/people/019a4b2c-0000-7000-8000-000000000002' }, ', she is nice',
    ])
  })

  it('keeps each other link as plain text, so no outside link can mislead', () => {
    for (const text of ['Pay at https://roomsie.in.evil.com/places/019a4b2c-0000-7000-8000-000000000001', 'https://evil.com/places/x', 'https://roomsie.in/admin', 'no link at all']) {
      expect(cardLinks(text, origin)).toEqual([text])
    }
  })
})

describe('the minutes of a deploy (T-50)', () => {
  it('names the route that the old API does not have yet, and leaves a goal that is not found as it is', () => {
    expect(deployRefusal(new ApiError(404, { message: 'Route POST:/v1/goals/x/close not found', error: 'Not Found', statusCode: 404 }))).toMatch(/few minutes/)
    expect(deployRefusal(new ApiError(404, { error: 'not found' }))).toBeNull()
    expect(deployRefusal(new ApiError(409, { error: 'Close the goal first.' }))).toBeNull()
  })
})
