import { describe, expect, it } from 'vitest'
import { ApiError, refusalOf } from './api'

describe('refusalOf', () => {
  it('reads the refusal of the gate, and nothing from a different error', () => {
    const refusal = { error: 'invite only', opensAt: '2026-11-07T18:30:00.000Z', account: true }
    expect(refusalOf(new ApiError(403, refusal))).toEqual(refusal)
    expect(refusalOf(new ApiError(403, { error: 'forbidden' }))).toBeNull()
    expect(refusalOf(new ApiError(401, refusal))).toBeNull()
    expect(refusalOf(new Error('offline'))).toBeNull()
  })
})
