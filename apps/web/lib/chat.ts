import { intents, isOpenSlot, type ChipSlot, type FormA, type GoalResponse } from '@roomsie/contract'

export const canSend = (text: string) => text.trim().length > 0

/** What a key does in the chat input. `block`: Enter on a blank message adds no line. */
export function keyAction(press: { key: string; shiftKey: boolean; isComposing: boolean }, text: string): 'send' | 'block' | 'type' {
  // An Enter that ends a word of an Indian-language keyboard is not a send.
  if (press.key !== 'Enter' || press.shiftKey || press.isComposing) return 'type'
  return canSend(text) ? 'send' : 'block'
}

/** The browser keeps the last goal, the visitor key of the API and the waitlist joins, never a sign-in token (ADR-0007). */
export const chatStorage = { goal: 'roomsie.goal', visitorKey: 'roomsie.visitorKey', waitlist: 'roomsie.waitlist' } as const
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

/** The chips under the newest question, while its slot is empty or unclear. A new goal starts with the place types (T-09). */
export function chipsOf(turns: readonly GoalResponse['turns'][number][], form: FormA): ChipSlot | null {
  const newest = turns.at(-1)
  const slot = newest ? newest.chips : 'intent'
  return slot && isOpenSlot(form[slot]) ? slot : null
}

/** After "Not sure, help me pick", the four place types show again. */
export const placeTypes = (form: FormA) => intents.filter((intent) => intent !== 'unclear' || form.intent.value !== 'unclear')

export const toggled = <T>(list: readonly T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])
