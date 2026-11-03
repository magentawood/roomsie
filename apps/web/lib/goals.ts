import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ApiError } from './api'
import { chatStorage, readStored } from './chat'

/** The goal of the chat: the one in the address, else the last one of this browser. Undefined until the browser reads it, null when it has none. */
export function useCurrentGoalId() {
  const fromAddress = useSearchParams().get('goal')
  const [stored, setStored] = useState<string | null | undefined>()
  useEffect(() => setStored(readStored(chatStorage.goal)), [])
  return fromAddress ?? stored
}

export const goalHref = (id: string) => `/chat?goal=${id}`

/** For the minutes of a deploy, the old API has no route of T-50, and Fastify answers "Route … not found" (api.md). */
export function deployRefusal(err: unknown) {
  const body = err instanceof ApiError && err.status === 404 ? err.body : null
  const message = body && typeof body === 'object' && 'message' in body ? body.message : null
  return typeof message === 'string' && /^Route .+ not found$/.test(message) ? 'This starts in a few minutes. Try again soon.' : null
}
