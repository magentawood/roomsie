import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from 'firebase/auth'
import { chatStorage, readStored, writeStored } from './chat'
import { claimVisitorChat } from './claim'

const user = { getIdToken: async () => 'token-1' } as User

describe('the claim of the visitor chat at sign-in (T-17)', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) })
    writeStored(chatStorage.goal, 'goal-1')
  })
  afterEach(() => vi.unstubAllGlobals())

  it('sends the token and the visitor key, then forgets the key and keeps the goal', async () => {
    writeStored(chatStorage.visitorKey, 'key-1')
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    expect(await claimVisitorChat(user)).toBe(true)
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect([url.endsWith('/v1/goals/claim'), init.method, init.headers]).toEqual([true, 'POST', { authorization: 'Bearer token-1', 'x-visitor-key': 'key-1' }])
    expect([readStored(chatStorage.goal), readStored(chatStorage.visitorKey)]).toEqual(['goal-1', null])
  })

  it('keeps the key when the claim fails, so the next load tries again', async () => {
    writeStored(chatStorage.visitorKey, 'key-1')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })))
    await expect(claimVisitorChat(user)).rejects.toThrow()
    expect(readStored(chatStorage.visitorKey)).toBe('key-1')
  })

  it('sends nothing when the browser has no visitor key', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect(await claimVisitorChat(user)).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
})
