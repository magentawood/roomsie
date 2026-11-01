import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatHeaders, chatStorage, forgetChat, keyAction, readStored, writeStored } from './chat'

describe('the send rule of the chat input', () => {
  it.each([
    ['Enter sends', 'Enter', {}, '2 bhk in Andheri', 'send'],
    ['Shift+Enter makes a new line', 'Enter', { shiftKey: true }, '2 bhk in Andheri', 'type'],
    ['Enter never sends an empty message', 'Enter', {}, '', 'block'],
    ['Enter never sends a blank message', 'Enter', {}, ' \n\t ', 'block'],
    ['Enter that ends a word of a Hindi keyboard is not a send', 'Enter', { isComposing: true }, 'कमरा', 'type'],
    ['other keys type', 'a', {}, '', 'type'],
  ] as const)('%s', (_, key, patch, text, action) => {
    expect(keyAction({ key, shiftKey: false, isComposing: false, ...patch }, text)).toBe(action)
  })
})

describe('the headers of the chat', () => {
  it('sends the token, the visitor key, both or none', () => {
    expect(chatHeaders('token', null, false)).toEqual({ authorization: 'Bearer token' })
    expect(chatHeaders(null, 'key', true)).toEqual({ 'x-visitor-key': 'key', 'content-type': 'application/json' })
    expect(chatHeaders('token', 'key', false)).toEqual({ authorization: 'Bearer token', 'x-visitor-key': 'key' })
    expect(chatHeaders(null, null, false)).toEqual({})
  })
})

describe('the stored chat', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('keeps the goal and the visitor key, and forgets both at sign-out', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) })
    writeStored(chatStorage.goal, 'goal-1')
    writeStored(chatStorage.visitorKey, 'key-1')
    expect(readStored(chatStorage.goal)).toBe('goal-1')
    forgetChat()
    expect([readStored(chatStorage.goal), readStored(chatStorage.visitorKey)]).toEqual([null, null])
  })

  it('reads nothing, and does not throw, where the browser blocks the storage', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } })
    expect(readStored(chatStorage.goal)).toBeNull()
    expect(() => writeStored(chatStorage.goal, 'goal-1')).not.toThrow()
  })
})
