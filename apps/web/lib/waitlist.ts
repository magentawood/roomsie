import { z } from 'zod'
import { isOpenSlot, panelReady, plainText, waitlistPlace, waitlistPlaceNames, type FormA, type WaitlistPlace } from '@roomsie/contract'
import { chatStorage, readStored, writeStored } from './chat'

/** The content of the panel (PD6c). Null: no panel yet. */
export function panelContent(form: FormA, outsidePlaces: readonly WaitlistPlace[]) {
  if (outsidePlaces.length && isOpenSlot(form.areas)) return 'waitlist'
  if (!panelReady(form)) return null
  return outsidePlaces.length ? 'results-with-line' : 'results'
}

/** The waitlist place of a typed name or other name. Null: a Mumbai area or an unknown name. */
export function placeOf(text: string): WaitlistPlace | null {
  // The same form of the words as the match of the chat.
  const typed = plainText(text)
  return waitlistPlace.options.find((slug) => [waitlistPlaceNames[slug].name, ...waitlistPlaceNames[slug].aliases].some((name) => plainText(name) === typed)) ?? null
}

// The browser can hold a value from an older version, so it is checked.
const storedJoins = z.record(z.string(), z.array(waitlistPlace))
const joinedAll = () => {
  try {
    return storedJoins.parse(JSON.parse(readStored(chatStorage.waitlist) ?? '{}'))
  } catch {
    return {}
  }
}
/** The places that this browser joined from a chat. The API never tells if an email is on the list (T-22a). */
export const joinedPlaces = (goalId: string) => joinedAll()[goalId] ?? []
export function rememberJoin(goalId: string, place: WaitlistPlace) {
  const all = joinedAll()
  all[goalId] = [...new Set([...(all[goalId] ?? []), place])]
  writeStored(chatStorage.waitlist, JSON.stringify(all))
}
