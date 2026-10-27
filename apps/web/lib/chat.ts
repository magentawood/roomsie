export const canSend = (text: string) => text.trim().length > 0

/** What a key does in the chat input. `block`: Enter on a blank message adds no line. */
export function keyAction(e: { key: string; shiftKey: boolean; isComposing: boolean }, text: string): 'send' | 'block' | 'type' {
  // An Enter that ends a word of an Indian-language keyboard is not a send.
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return 'type'
  return canSend(text) ? 'send' : 'block'
}
