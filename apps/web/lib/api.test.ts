import { afterEach, describe, expect, it, vi } from 'vitest'
import type { User } from 'firebase/auth'
import { z } from 'zod'
import { api, ApiError, refusalOf, requestHeaders } from './api'

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

describe('api', () => {
  afterEach(() => vi.unstubAllGlobals())

  const headersOf = async (user: User | null) => {
    const fetch = vi.fn(async () => new Response('{}'))
    vi.stubGlobal('fetch', fetch)
    await api(user, '/v1/areas', z.object({}))
    return (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].headers
  }

  it('sends the token of a signed-in user, and no token for a guest', async () => {
    const user = { getIdToken: async () => 'token-1' } as User
    expect(await headersOf(user)).toEqual({ authorization: 'Bearer token-1' })
    expect(await headersOf(null)).toEqual({})
  })
})
