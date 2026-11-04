import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { chatStorage, readStored } from './chat'

/** The goal of the chat: the one in the address, else the last one of this browser. Undefined until the browser reads it, null when it has none. */
export function useCurrentGoalId() {
  const fromAddress = useSearchParams().get('goal')
  const [stored, setStored] = useState<string | null | undefined>()
  useEffect(() => setStored(readStored(chatStorage.goal)), [])
  return fromAddress ?? stored
}

/** The onboarding of a new goal. Plain `/start` opens the last goal of the browser (T-48). */
export const newGoalHref = '/start?new'
