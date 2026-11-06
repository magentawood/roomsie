import { useSearchParams } from 'next/navigation'

/** The goal of the chat: the one in the address, else null. Each other way into the chat starts a new goal, as a new chat of ChatGPT. */
export const useCurrentGoalId = () => useSearchParams().get('goal')

/** The onboarding of a new goal (T-48). */
export const newGoalHref = '/start'
/** The address of the chat of a goal: a reload or a sign-in stays in it. */
export const goalHref = (id: string) => `/chat?goal=${id}`
