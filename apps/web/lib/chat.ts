/** The line under a sent message until the turn route of T-12 replies. */
export const notLiveLine = 'The assistant isn’t live yet. Your message stays here until it is.'

export const canSend = (text: string) => text.trim().length > 0

/**
 * What a key does in the chat input. Enter sends, Shift+Enter makes a new line, and a blank message never sends.
 * `block`: Enter on a blank message adds no line.
 */
export function keyAction(e: { key: string; shiftKey: boolean; isComposing: boolean }, text: string): 'send' | 'block' | 'type' {
  // An Enter that ends a word of an Indian-language keyboard is not a send.
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return 'type'
  return canSend(text) ? 'send' : 'block'
}
