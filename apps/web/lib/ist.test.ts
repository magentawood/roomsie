import { describe, expect, it } from 'vitest'
import { fromIstInput, istDay, toIstInput } from './ist'

describe('the times in IST', () => {
  it('shows a stored moment in IST, and reads it back as the same moment', () => {
    expect(toIstInput('2026-11-07T18:30:00.000Z')).toBe('2026-11-08T00:00')
    expect(Date.parse(fromIstInput('2026-11-08T00:00')!)).toBe(Date.parse('2026-11-07T18:30:00.000Z'))
  })

  it('moves to the next day after 18:30 UTC', () => {
    expect(toIstInput('2026-10-28T18:29:00.000Z')).toBe('2026-10-28T23:59')
    expect(istDay('2026-10-28T18:30:00.000Z', 'short')).toBe('29 Oct')
    expect(istDay('2026-11-07T18:30:00.000Z')).toBe('8 November')
    expect(istDay('2026-10-08', 'long', 'numeric')).toBe('8 October 2026')
  })

  it('keeps an empty value empty', () => {
    expect(toIstInput(null)).toBe('')
    expect(fromIstInput('')).toBeNull()
  })
})
