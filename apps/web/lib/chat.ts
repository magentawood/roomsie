import { visitorKeyHeader } from '@roomsie/contract'

export const canSend = (text: string) => text.trim().length > 0

/** What a key does in the chat input. `block`: Enter on a blank message adds no line. */
export function keyAction(press: { key: string; shiftKey: boolean; isComposing: boolean }, text: string): 'send' | 'block' | 'type' {
  // An Enter that ends a word of an Indian-language keyboard is not a send.
  if (press.key !== 'Enter' || press.shiftKey || press.isComposing) return 'type'
  return canSend(text) ? 'send' : 'block'
}

/** The browser keeps the open goal and the visitor key of the API, never a sign-in token (ADR-0007). */
export const chatStorage = { goal: 'roomsie.goal', visitorKey: 'roomsie.visitorKey' } as const
type StoredKey = (typeof chatStorage)[keyof typeof chatStorage]

/** A private window or a blocked site storage throws: then the chat lives only until a reload. */
export function readStored(key: StoredKey) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
export function writeStored(key: StoredKey, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // The chat still works until a reload.
  }
}
/** At sign-out, so the next person on this browser cannot open the chat. */
export const forgetChat = () => Object.values(chatStorage).forEach((key) => writeStored(key, null))

/** A signed-in person sends the token, and a visitor the key. Before T-17 moves a visitor goal, a person sends both. */
export function chatHeaders(token: string | null, visitorKey: string | null, json: boolean): Record<string, string> {
  return {
    ...(token && { authorization: `Bearer ${token}` }),
    ...(visitorKey && { [visitorKeyHeader]: visitorKey }),
    ...(json && { 'content-type': 'application/json' }),
  }
}
