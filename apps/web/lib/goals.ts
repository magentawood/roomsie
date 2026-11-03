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

/** The message that the Share modal sends to each ticked conversation. */
export const shareText = (title: string, url: string) => `${title}: ${url}`

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The text of a message, with each link to a place or a person of this site as a link. Each other link stays text (T-50). */
export function cardLinks(text: string, origin: string): (string | { href: string; text: string })[] {
  const card = new RegExp(`${escaped(origin)}(/(?:places|people)/[0-9a-f-]{36})(?![\\w/-])`, 'g')
  const parts: (string | { href: string; text: string })[] = []
  let from = 0
  for (const match of text.matchAll(card)) {
    if (match.index > from) parts.push(text.slice(from, match.index))
    parts.push({ href: match[1]!, text: match[0] })
    from = match.index + match[0].length
  }
  if (from < text.length || !parts.length) parts.push(text.slice(from))
  return parts
}

/** For the minutes of a deploy, the old API has no route of T-50, and Fastify answers "Route … not found" (api.md). */
export function deployRefusal(err: unknown) {
  const body = err instanceof ApiError && err.status === 404 ? err.body : null
  const message = body && typeof body === 'object' && 'message' in body ? body.message : null
  return typeof message === 'string' && /^Route .+ not found$/.test(message) ? 'This starts in a few minutes. Try again soon.' : null
}
