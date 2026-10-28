import type { InfiniteData } from '@tanstack/react-query'
import type { Conversation, ConversationsResponse, IncomingRequest, Message, OtherPerson, OutgoingRequest } from '@roomsie/contract'
import { india } from './ist'

/** A row of the inbox. `id` opens its thread. */
export type InboxItem = { id: string; other: OtherPerson; listingId: string | null; at: string } & (
  | { kind: 'conversation'; conversation: Conversation }
  | { kind: 'sent'; request: OutgoingRequest }
)

/** Everything that waits for the user: the unread messages and the open requests to them. */
export const badgeCount = (conversations: readonly Conversation[], incoming: readonly IncomingRequest[]) =>
  conversations.reduce((sum, c) => sum + c.unread, 0) + incoming.length

/** The person and the listing of a chat, so that two requests to one recipient show as one row. */
const recipientKeys = (other: OtherPerson, listingId: string | null) => [other.profileId, listingId].filter((key) => key !== null)

/**
 * An accepted request is a conversation, so only the waiting and the "Not available" requests show as their own threads.
 * `outgoing` comes newest first, as the API gives it, and each recipient shows once: the chat, or else the newest request.
 */
export function inboxItems(conversations: readonly Conversation[], outgoing: readonly OutgoingRequest[]): InboxItem[] {
  const shown = new Set(conversations.flatMap((c) => recipientKeys(c.other, c.listingId)))
  const sent = outgoing.filter((r) => {
    const keys = recipientKeys(r.to, r.listingId)
    if (r.state === 'accepted' || keys.some((key) => shown.has(key))) return false
    keys.forEach((key) => shown.add(key))
    return true
  })
  const items: InboxItem[] = [
    ...conversations.map((conversation) => ({
      kind: 'conversation' as const, conversation, id: conversation.id, other: conversation.other, listingId: conversation.listingId, at: conversation.lastMessage?.createdAt ?? '',
    })),
    ...sent.map((request) => ({ kind: 'sent' as const, request, id: request.id, other: request.to, listingId: request.listingId, at: request.createdAt })),
  ]
  return items.sort((a, b) => b.at.localeCompare(a.at))
}

/** The message button of a listing follows the newest request of the user to it. `outgoing` comes newest first. */
export function listingChat(outgoing: readonly OutgoingRequest[], conversations: readonly Conversation[], listingId: string) {
  const newest = outgoing.find((r) => r.listingId === listingId)
  if (!newest) return { state: 'none' as const }
  if (newest.state === 'open') return { state: 'sent' as const }
  if (newest.state === 'not_available') return { state: 'not_available' as const }
  return { state: 'accepted' as const, conversationId: conversations.find((c) => c.listingId === listingId)?.id }
}

export const chatWith = (conversations: readonly Conversation[], profileId: string) =>
  conversations.find((c) => c.other.profileId === profileId)?.id

/** The profile that a chat can open: none for a deleted account or a lister with no profile. */
export const profileOf = (other: OtherPerson) => (other.deleted ? null : other.profileId)

const dayOf = (at: Date) => at.toLocaleDateString('en-CA', india)
const daysBefore = (now: Date, days: number) => dayOf(new Date(now.getTime() - days * 86_400_000))
const shortDate = (at: Date) => at.toLocaleDateString('en-IN', { ...india, day: 'numeric', month: 'short', year: '2-digit' })
export const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { ...india, hour: 'numeric', minute: '2-digit' }).replace(/\s/g, '').toLowerCase()

/** The time in an inbox row, as the drafts: "2:41pm", "Yesterday", "Mon", then the date. */
export function inboxTime(iso: string, now = new Date()) {
  const at = new Date(iso)
  const day = dayOf(at)
  if (day === dayOf(now)) return clockTime(iso)
  if (day === daysBefore(now, 1)) return 'Yesterday'
  if (day > daysBefore(now, 7)) return at.toLocaleDateString('en-IN', { ...india, weekday: 'short' })
  return shortDate(at)
}

const daysBetween = (from: Date, to: Date) => (Date.parse(dayOf(to)) - Date.parse(dayOf(from))) / 86_400_000

/** A request to the user, as the requests drafts: "Sent 3 days ago · Closes in 11 days". */
export function requestTimes(createdAt: string, expiresAt: string, now = new Date()) {
  const ago = daysBetween(new Date(createdAt), now)
  const left = daysBetween(now, new Date(expiresAt))
  return `${ago === 0 ? 'Sent today' : `Sent ${ago} ${ago === 1 ? 'day' : 'days'} ago`} · ${left <= 0 ? 'Closes today' : left === 1 ? 'Closes tomorrow' : `Closes in ${left} days`}`
}

/** The API gives each page newest first. The thread shows the messages oldest first, under a line for each day. */
export function threadDays(newestFirst: readonly Message[], now = new Date()) {
  const days: { label: string; messages: Message[] }[] = []
  let current = ''
  for (const m of [...newestFirst].reverse()) {
    const at = new Date(m.createdAt)
    const day = dayOf(at)
    if (day !== current) {
      current = day
      days.push({ label: day === dayOf(now) ? 'Today' : day === daysBefore(now, 1) ? 'Yesterday' : shortDate(at), messages: [] })
    }
    days.at(-1)!.messages.push(m)
  }
  return days
}

/** Undefined: the chat is not in the list, so the list loads again. */
export function withMessage(data: ConversationsResponse | undefined, m: Message): ConversationsResponse | undefined {
  const chat = data?.conversations.find((c) => c.id === m.conversationId)
  if (!data || !chat) return undefined
  if (chat.lastMessage?.id === m.id) return data
  return { conversations: data.conversations.map((c) => (c === chat ? { ...c, lastMessage: m, unread: c.unread + (m.mine ? 0 : 1) } : c)) }
}

export type MessagePages = InfiniteData<{ messages: Message[]; hasMore: boolean }, string | undefined>

/** A live or a sent message goes on top of the newest page. A thread that is not loaded gets it at its first fetch. */
export function addMessage(data: MessagePages | undefined, m: Message): MessagePages | undefined {
  if (!data || data.pages.some((page) => page.messages.some((old) => old.id === m.id))) return data
  const [newest, ...older] = data.pages
  return { ...data, pages: [{ ...newest!, messages: [m, ...newest!.messages] }, ...older] }
}
