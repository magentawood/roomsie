import { and, count, desc, eq, gt, inArray, ne, or } from 'drizzle-orm'
import type { Conversation, Message } from '@roomsie/contract'
import type { Db } from '../db/client'
import { messages } from '../db/schema'
import { peopleOf } from '../profiles/read'
import { acceptedRequestsOf } from '../requests/read'
import type { Storage } from '../storage'

export type MessageRow = typeof messages.$inferSelect

export const messageView = (m: MessageRow, viewerUserId: string): Message => ({
  id: m.id, conversationId: m.requestId, mine: m.senderUserId === viewerUserId, text: m.text, createdAt: m.createdAt.toISOString(),
})

/** The other person of the conversation, and if the viewer can send; or nothing when the viewer is not in it. */
export async function conversationFor(db: Db, storage: Storage, viewerUserId: string, conversationId: string) {
  const [request] = await acceptedRequestsOf(db, viewerUserId, conversationId)
  if (!request) return undefined
  const other = (await peopleOf(db, storage, [request.otherUserId])).get(request.otherUserId)!
  return { otherUserId: request.otherUserId, canSend: other.active }
}

export async function listConversations(db: Db, storage: Storage, viewerUserId: string): Promise<Conversation[]> {
  const requests = await acceptedRequestsOf(db, viewerUserId)
  if (!requests.length) return []
  const [people, last, unread] = await Promise.all([
    peopleOf(db, storage, requests.map((r) => r.otherUserId)),
    db.selectDistinctOn([messages.requestId]).from(messages)
      .where(inArray(messages.requestId, requests.map((r) => r.id))).orderBy(messages.requestId, desc(messages.createdAt)),
    // The messages of the other person after the last read of the viewer, in each conversation.
    db.select({ requestId: messages.requestId, unread: count() }).from(messages)
      .where(and(ne(messages.senderUserId, viewerUserId), or(...requests.map((r) => and(eq(messages.requestId, r.id), r.readAt ? gt(messages.createdAt, r.readAt) : undefined)))))
      .groupBy(messages.requestId),
  ])
  const lastOf = new Map(last.map((m) => [m.requestId, m]))
  const unreadOf = new Map(unread.map((u) => [u.requestId, u.unread]))
  return requests
    .map((request) => {
      const { active, ...other } = people.get(request.otherUserId)!
      const lastMessage = lastOf.get(request.id)
      return {
        id: request.id,
        // A lister can have no profile: the web names them.
        other,
        listingId: request.listingId,
        lastMessage: lastMessage ? messageView(lastMessage, viewerUserId) : null,
        unread: unreadOf.get(request.id) ?? 0,
        canSend: active,
      }
    })
    .sort((a, b) => (b.lastMessage?.createdAt ?? '').localeCompare(a.lastMessage?.createdAt ?? ''))
}
