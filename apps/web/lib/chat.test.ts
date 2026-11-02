import { afterEach, describe, expect, it, vi } from 'vitest'
import { formA, type ChipSlot, type GoalResponse } from '@roomsie/contract'
import { chatStorage, chipsOf, forgetChat, keyAction, placeTypes, readStored, toggled, writeStored } from './chat'

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

describe('the chips of the chat (T-09)', () => {
  const turn = (role: 'user' | 'assistant', chips: ChipSlot | null = null): GoalResponse['turns'][number] =>
    ({ id: crypto.randomUUID(), role, text: 'text', chips, createdAt: new Date().toISOString() })
  const empty = formA.parse({})

  it('starts a new goal with the place types, except while new chats are over their limit', () => {
    expect(chipsOf([], empty)).toBe('intent')
    expect(chipsOf([], empty, true)).toBeNull()
    expect(chipsOf([], formA.parse({ intent: { source: 'stated', value: 'pg' } }))).toBeNull()
  })

  it('shows the chips of the newest question while its slot is empty or unclear', () => {
    expect(chipsOf([turn('user'), turn('assistant', 'areas')], empty)).toBe('areas')
    expect(chipsOf([turn('user'), turn('assistant', 'intent')], formA.parse({ intent: { source: 'stated', value: 'unclear' } }))).toBe('intent')
    expect(chipsOf([turn('user'), turn('assistant', 'areas')], formA.parse({ areas: { source: 'stated', value: ['thane'] } }))).toBeNull()
    expect(chipsOf([turn('user'), turn('assistant')], empty)).toBeNull()
    expect(chipsOf([turn('assistant', 'areas'), turn('user')], empty)).toBeNull()
  })

  it('shows the four place types again after "Not sure, help me pick"', () => {
    expect(placeTypes(empty)).toEqual(['room', 'pg', 'whole_flat', 'flatmates', 'unclear'])
    expect(placeTypes(formA.parse({ intent: { source: 'stated', value: 'unclear' } }))).toEqual(['room', 'pg', 'whole_flat', 'flatmates'])
  })

  it('turns an area on and off', () => {
    expect(toggled(['thane'], 'navi-mumbai')).toEqual(['thane', 'navi-mumbai'])
    expect(toggled(['thane', 'navi-mumbai'], 'thane')).toEqual(['navi-mumbai'])
  })
})
