import { useSyncExternalStore } from 'react'
import { useSearchParams } from 'next/navigation'
import { chatStorage, readStored } from './chat'

/** The goal of the chat: the one in the address, else null. Each other way into the chat starts a new goal, as a new chat of ChatGPT. */
export const useCurrentGoalId = () => useSearchParams().get('goal')

/** "What are we looking for?": the first message makes the goal (flow 02). */
export const newGoalHref = '/chat'
/** The address of the chat of a goal: a reload or a sign-in stays in it. */
export const goalHref = (id: string) => `/chat?goal=${id}`

const noChange = () => () => {}
/** The Chats tab goes back to the chat of this visit of the tab, else to a new goal. The server has no tab, so it renders a new goal. */
export function useChatsHref() {
  const id = useSyncExternalStore(noChange, () => readStored(chatStorage.tabGoal), () => null)
  return id ? goalHref(id) : newGoalHref
}
