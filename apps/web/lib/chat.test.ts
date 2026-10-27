import { describe, expect, it } from 'vitest'
import { keyAction } from './chat'

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
