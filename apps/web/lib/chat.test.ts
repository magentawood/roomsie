import { afterEach, describe, expect, it, vi } from 'vitest'
import { formA, type ChipSlot, type GoalResponse } from '@roomsie/contract'
import { chatStorage, chipsOf, forgetChat, keyAction, lastOpenGoal, placeTypes, readStored, sameMoveOf, tapRefusal, toggled, writeStored } from './chat'

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

  const storage = () => {
    const store = new Map<string, string>()
    return { store, getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) }
  }

  it('keeps the visitor key and the chat for the visit of the tab, the waitlist and the done onboarding longer, and forgets all at sign-out', () => {
    const [local, session] = [storage(), storage()]
    vi.stubGlobal('localStorage', local)
    vi.stubGlobal('sessionStorage', session)
    writeStored(chatStorage.waitlist, '{}')
    writeStored(chatStorage.visitorKey, 'key-1')
    writeStored(chatStorage.tabGoal, 'goal-1')
    writeStored(chatStorage.onboarded, '1')
    expect([readStored(chatStorage.visitorKey), [...session.store.keys()], [...local.store.keys()]])
      .toEqual(['key-1', [chatStorage.visitorKey, chatStorage.tabGoal], [chatStorage.waitlist, chatStorage.onboarded]])
    forgetChat()
    expect([readStored(chatStorage.waitlist), readStored(chatStorage.visitorKey), readStored(chatStorage.tabGoal)]).toEqual([null, null, null])
  })

  it('reads nothing, and does not throw, where the browser blocks the storage', () => {
    vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } })
    expect(readStored(chatStorage.visitorKey)).toBeNull()
    expect(() => writeStored(chatStorage.visitorKey, 'key-1')).not.toThrow()
  })
})

describe('the chat of "Ask in chat" on the page of a card', () => {
  const goals = [{ id: 'closed', status: 'closed' as const }, { id: 'newest', status: 'open' as const }, { id: 'older', status: 'open' as const }]

  it('is the chat of the tab, else the newest open goal, else a new goal', () => {
    expect(lastOpenGoal('older', goals)).toBe('older')
    expect(lastOpenGoal(null, goals)).toBe('newest')
    // A closed goal takes no message.
    expect(lastOpenGoal('closed', goals)).toBe('newest')
    expect(lastOpenGoal(null, [])).toBeNull()
  })
})

describe('the chips of the chat (T-09)', () => {
  const turn = (role: 'user' | 'assistant', chips: ChipSlot | null = null): GoalResponse['turns'][number] =>
    ({ id: crypto.randomUUID(), role, text: 'text', chips, comparison: null, notes: false, sameMove: null, createdAt: new Date().toISOString() })
  const empty = formA.parse({})

  it('starts a new goal with the place types', () => {
    expect(chipsOf([], empty)).toBe('intent')
    expect(chipsOf([], formA.parse({ intent: { source: 'stated', value: 'pg' } }))).toBeNull()
  })

  it('shows the chips of the newest question while its slot is empty or unclear', () => {
    expect(chipsOf([turn('user'), turn('assistant', 'areas')], empty)).toBe('areas')
    expect(chipsOf([turn('user'), turn('assistant', 'intent')], formA.parse({ intent: { source: 'stated', value: 'unclear' } }))).toBe('intent')
    expect(chipsOf([turn('user'), turn('assistant', 'areas')], formA.parse({ areas: { source: 'stated', value: ['thane'] } }))).toBeNull()
    expect(chipsOf([turn('user'), turn('assistant')], empty)).toBeNull()
    expect(chipsOf([turn('assistant', 'areas'), turn('user')], empty)).toBeNull()
  })

  it('shows the chips of a question inside the lifestyle or the must-haves, while its slot is open (T-59)', () => {
    expect(chipsOf([turn('user'), turn('assistant', 'lifestyle.food')], empty)).toBe('lifestyle.food')
    expect(chipsOf([turn('user'), turn('assistant', 'lifestyle.food')], formA.parse({ lifestyle: { food: { source: 'stated', value: 'veg' } } }))).toBeNull()
    expect(chipsOf([turn('user'), turn('assistant', 'mustHaves.veg_kitchen')], formA.parse({ mustHaves: { veg_kitchen: { source: 'stated', value: 'unclear' } } }))).toBe('mustHaves.veg_kitchen')
  })

  it('names the minutes of a deploy when the old API refuses a new chip (T-59)', () => {
    expect(tapRefusal('not valid: body')).toMatch(/few minutes/)
    expect(tapRefusal('not valid: areas')).toBeNull()
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

describe('"Same move?" (Figma 67:6489)', () => {
  const turn = (sameMove: { title: string } | null = null): GoalResponse['turns'][number] =>
    ({ id: crypto.randomUUID(), role: 'assistant', text: 'text', chips: null, comparison: null, notes: false, sameMove, createdAt: new Date().toISOString() })

  it('shows its chips only under the newest turn', () => {
    expect(sameMoveOf([turn({ title: 'Room hunting in Powai' })])).toEqual({ title: 'Room hunting in Powai' })
    expect(sameMoveOf([turn({ title: 'Room hunting in Powai' }), turn()])).toBeNull()
    expect(sameMoveOf([])).toBeNull()
  })
})
