import { describe, expect, it } from 'vitest'
import { parseMoveDate } from '../src/assistant/handlers/extractor/move-date-words'

/** A Monday in November 2026, in IST. */
const today = '2026-11-02'

describe('the move date parser', () => {
  it.each([
    ['2026-12-01', '2026-12-01'],
    ['1st Dec', '2026-12-01'],
    ['1 December', '2026-12-01'],
    ['Dec 15', '2026-12-15'],
    ['15/12', '2026-12-15'],
    ['15/12/2026', '2026-12-15'],
    ['December', '2026-12-01'],
    ['disambar', '2026-12-01'],
    ['january', '2027-01-01'],
    ['10 Jan', '2027-01-10'],
    ['mid December', '2026-12-15'],
    ['end of December', '2026-12-31'],
    ['november', today],
    ['next month', '2026-12-01'],
    ['agle mahine', '2026-12-01'],
    ['pudhchya mahinyat', '2026-12-01'],
    ['this month', today],
    ['month end', '2026-11-30'],
    ['end of the month', '2026-11-30'],
    ['next month end', '2026-12-31'],
    ['ASAP', today],
    ['immediately', today],
    ['abhi', today],
    ['turant', today],
    ['tomorrow', '2026-11-03'],
    ['next week', '2026-11-09'],
    ['agle hafte', '2026-11-09'],
    ['in 2 weeks', '2026-11-16'],
    ['10 din mein', '2026-11-12'],
    ['in 3 months', '2027-02-02'],
  ])('reads %s', (words, date) => {
    expect(parseMoveDate(words, today)).toBe(date)
  })

  it('reads the end of a month for a day that the next month does not have', () => {
    expect(parseMoveDate('next month', '2027-01-31')).toBe('2027-02-01')
    expect(parseMoveDate('in 1 month', '2027-01-31')).toBe('2027-02-28')
  })

  it.each(['soon', 'whenever', 'kabhi bhi', '', '31 Feb', '45/12'])('reads nothing in %j', (words) => {
    expect(parseMoveDate(words, today)).toBeNull()
  })
})
