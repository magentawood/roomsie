import type { InfiniteData } from '@tanstack/react-query'
import type { Conversation, IncomingRequest, ListingKind, Message, OutgoingRequest } from '@roomsie/contract'

export type InboxItem =
  | { kind: 'conversation'; conversation: Conversation; at: string }
  | { kind: 'sent'; request: OutgoingRequest; at: string }

/** Everything that waits for the user: the unread messages and the open requests to them. */
export const badgeCount = (conversations: readonly Conversation[], incoming: readonly IncomingRequest[]) =>
  conversations.reduce((sum, c) => sum + c.unread, 0) + incoming.length

/** An accepted request is a conversation, so only the waiting and the "Not available" requests show as their own threads. */
export function inboxItems(conversations: readonly Conversation[], outgoing: readonly OutgoingRequest[]): InboxItem[] {
  const items: InboxItem[] = [
    ...conversations.map((conversation) => ({ kind: 'conversation' as const, conversation, at: conversation.lastMessage?.createdAt ?? '' })),
    ...outgoing.filter((r) => r.state !== 'accepted').map((request) => ({ kind: 'sent' as const, request, at: request.createdAt })),
  ]
  return items.sort((a, b) => b.at.localeCompare(a.at))
}

export const otherName = (other: Conversation['other']) => (other.deleted ? 'Deleted user' : other.name)

/** The message button of a listing follows the newest request of the user to it. */
export function listingChat(outgoing: readonly OutgoingRequest[], conversations: readonly Conversation[], listingId: string) {
  const newest = outgoing.filter((r) => r.listingId === listingId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  if (!newest) return { state: 'none' as const }
  if (newest.state === 'open') return { state: 'sent' as const }
  if (newest.state === 'not_available') return { state: 'not_available' as const }
  return { state: 'accepted' as const, conversationId: conversations.find((c) => c.listingId === listingId)?.id }
}

/** The message button of a listing names its lister, as the listing details of the Product file. */
export const messageListerLabel = (kind: ListingKind) =>
  `Message ${({ pg: 'the PG/Hostel', broker_flat: 'the broker', owner_flat: 'the owner', room_in_flat: 'the flatmate' })[kind]}`

export const chatWith = (conversations: readonly Conversation[], profileId: string) =>
  conversations.find((c) => c.other.profileId === profileId)?.id

const india = { timeZone: 'Asia/Kolkata' } as const
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

export type MessagePages = InfiniteData<{ messages: Message[]; hasMore: boolean }, string | undefined>

/** A live or a sent message goes on top of the newest page. A thread that is not loaded gets it at its first fetch. */
export function addMessage(data: MessagePages | undefined, m: Message): MessagePages | undefined {
  if (!data || data.pages.some((page) => page.messages.some((old) => old.id === m.id))) return data
  const [newest, ...older] = data.pages
  return { ...data, pages: [{ ...newest!, messages: [m, ...newest!.messages] }, ...older] }
}
