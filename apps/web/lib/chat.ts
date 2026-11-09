import { intents, isOpenSlot, slotOf, type ChipSlot, type FormA, type GoalResponse } from '@roomsie/contract'

export const canSend = (text: string) => text.trim().length > 0

/** What a key does in the chat input. `block`: Enter on a blank message adds no line. */
export function keyAction(press: { key: string; shiftKey: boolean; isComposing: boolean }, text: string): 'send' | 'block' | 'type' {
  // An Enter that ends a word of an Indian-language keyboard is not a send.
  if (press.key !== 'Enter' || press.shiftKey || press.isComposing) return 'type'
  return canSend(text) ? 'send' : 'block'
}

/**
 * The browser keeps the visitor key of the API, the chat of the tab, the waitlist joins and the mark of a done onboarding, never a sign-in token (ADR-0007).
 * The key and the chat of the tab last for the visit of the tab, so a guest starts fresh on the next visit. The joins and the mark stay.
 */
/** `resultsAt`: the reply that brought the results of the tab's goal, so a reload keeps the results card in its place. */
export const chatStorage = {
  visitorKey: 'roomsie.visitorKey', tabGoal: 'roomsie.tabGoal', waitlist: 'roomsie.waitlist', onboarded: 'roomsie.onboarded', resultsAt: 'roomsie.resultsAt',
  /** "Ask in chat" on the page of a card: the draft that the chat input takes, one time. */
  draft: 'roomsie.chatDraft',
} as const
type StoredKey = (typeof chatStorage)[keyof typeof chatStorage]
const lasting: readonly StoredKey[] = [chatStorage.waitlist, chatStorage.onboarded]
const storeOf = (key: StoredKey) => (lasting.includes(key) ? localStorage : sessionStorage)

/** A private window or a blocked site storage throws: then the chat lives only until a reload. */
export function readStored(key: StoredKey) {
  try {
    return storeOf(key).getItem(key)
  } catch {
    return null
  }
}
export function writeStored(key: StoredKey, value: string | null) {
  try {
    if (value === null) storeOf(key).removeItem(key)
    else storeOf(key).setItem(key, value)
  } catch {
    // The chat still works until a reload.
  }
}
/** "Ask in chat" on the page of a card: the chat of this tab, else the newest open goal. Null: a new goal. A closed goal takes no message. */
export function lastOpenGoal(tabGoal: string | null, goals: readonly { id: string; status: 'open' | 'closed' }[]) {
  const open = goals.filter((goal) => goal.status === 'open')
  return open.some((goal) => goal.id === tabGoal) ? tabGoal : open[0]?.id ?? null
}

/** At sign-out, so the next person on this browser cannot open the chat. */
export const forgetChat = () => Object.values(chatStorage).forEach((key) => writeStored(key, null))

/** The chips under the newest question, while its slot is empty or unclear. A new goal starts with the place types (T-09). */
export function chipsOf(turns: readonly GoalResponse['turns'][number][], form: FormA): ChipSlot | null {
  const newest = turns.at(-1)
  const slot = newest ? newest.chips : 'intent'
  return slot && isOpenSlot(slotOf(form, slot)) ? slot : null
}

/** The question "Same move?" waits for one of its two chips while it is the newest turn (Figma 67:6489). */
export const sameMoveOf = (turns: readonly GoalResponse['turns'][number][]) => turns.at(-1)?.sameMove ?? null

/** For the minutes of a deploy, the old API refuses a chip of T-59 as a body that is not valid (api.md). */
export const tapRefusal = (error: string) => (error === 'not valid: body' ? 'These buttons start in a few minutes. Type your answer for now.' : null)

/** After "Not sure, help me pick", the four place types show again. */
export const placeTypes = (form: FormA) => intents.filter((intent) => intent !== 'unclear' || form.intent.value !== 'unclear')

export const toggled = <T>(list: readonly T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])
