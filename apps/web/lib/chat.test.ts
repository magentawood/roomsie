import { describe, expect, it } from 'vitest'
import { keyAction } from './chat'

const key = (k: string, patch: { shiftKey?: boolean; isComposing?: boolean } = {}) => ({ key: k, shiftKey: false, isComposing: false, ...patch })

describe('the send rule of the chat input', () => {
  it('sends a message on Enter', () => {
    expect(keyAction(key('Enter'), '2 bhk in Andheri')).toBe('send')
  })

  it('makes a new line on Shift+Enter', () => {
    expect(keyAction(key('Enter', { shiftKey: true }), '2 bhk in Andheri')).toBe('type')
  })

  it('never sends an empty or blank message, and Enter then adds no line', () => {
    expect(keyAction(key('Enter'), '')).toBe('block')
    expect(keyAction(key('Enter'), ' \n\t ')).toBe('block')
  })

  it('does not send while a keyboard of Hindi or Marathi still composes a word', () => {
    expect(keyAction(key('Enter', { isComposing: true }), 'कमरा')).toBe('type')
  })

  it('lets the other keys type', () => {
    expect(keyAction(key('a'), '')).toBe('type')
  })
})
