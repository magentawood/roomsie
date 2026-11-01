import { describe, expect, it } from 'vitest'
import { ApiError, refusalOf, requestHeaders } from './api'

describe('refusalOf', () => {
  it('reads the refusal of the gate, and nothing from a different error', () => {
    const refusal = { error: 'invite only', opensAt: '2026-11-07T18:30:00.000Z', account: true }
    expect(refusalOf(new ApiError(403, refusal))).toEqual(refusal)
    expect(refusalOf(new ApiError(403, { error: 'forbidden' }))).toBeNull()
    expect(refusalOf(new ApiError(401, refusal))).toBeNull()
    expect(refusalOf(new Error('offline'))).toBeNull()
  })
})

describe('the headers of a request', () => {
  it('sends the token, the visitor key, both or none', () => {
    expect(requestHeaders('token', null, false)).toEqual({ authorization: 'Bearer token' })
    expect(requestHeaders(null, 'key', true)).toEqual({ 'x-visitor-key': 'key', 'content-type': 'application/json' })
    expect(requestHeaders('token', 'key', false)).toEqual({ authorization: 'Bearer token', 'x-visitor-key': 'key' })
    expect(requestHeaders(null, null, false)).toEqual({})
  })
})
