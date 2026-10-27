import { and, count, desc, eq, gt, inArray, ne, or, sql } from 'drizzle-orm'
import type { Conversation, Message } from '@roomsie/contract'
import type { Db } from '../db/client'
import { connectionRequests, messages, profiles, users } from '../db/schema'
import { noBlockBetween } from '../match/query'
import type { Storage } from '../storage'

type MessageRow = typeof messages.$inferSelect

export const messageView = (m: MessageRow, viewerUserId: string): Message => ({
  id: m.id, conversationId: m.requestId, mine: m.senderUserId === viewerUserId, text: m.text, createdAt: m.createdAt.toISOString(),
})

/** The other person of a request, seen from the viewer. */
const otherOf = (viewerUserId: string) =>
  sql<string>`case when ${connectionRequests.fromUserId} = ${viewerUserId} then ${connectionRequests.toUserId} else ${connectionRequests.fromUserId} end`

/** The conversations of the viewer: the accepted requests with no block between the two people (T-44). */
export function conversationsOf(viewerUserId: string) {
  return and(
    eq(connectionRequests.status, 'accepted'),
    or(eq(connectionRequests.fromUserId, viewerUserId), eq(connectionRequests.toUserId, viewerUserId)),
    noBlockBetween(viewerUserId, otherOf(viewerUserId)),
  )
}

/** The conversation, the other person, and if the viewer can send; or nothing when the viewer is not in it. */
export async function participantOf(db: Db, viewerUserId: string, conversationId: string) {
  const [row] = await db.select({ request: connectionRequests, otherStatus: users.status }).from(connectionRequests)
    .innerJoin(users, eq(users.id, otherOf(viewerUserId)))
    .where(and(eq(connectionRequests.id, conversationId), conversationsOf(viewerUserId)))
  return row && { request: row.request, otherUserId: row.request.fromUserId === viewerUserId ? row.request.toUserId : row.request.fromUserId, canSend: row.otherStatus === 'active' }
}

/** The conversations of the viewer, the newest message first, with the other person, the last message and the unread count. */
export async function listConversations(db: Db, storage: Storage, viewerUserId: string, conversationId?: string): Promise<Conversation[]> {
  const rows = await db.select({ request: connectionRequests, other: users, profile: profiles }).from(connectionRequests)
    .innerJoin(users, eq(users.id, otherOf(viewerUserId)))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(conversationsOf(viewerUserId), conversationId ? eq(connectionRequests.id, conversationId) : undefined))
  const ids = rows.map((r) => r.request.id)
  const myReadAt = sql`case when ${connectionRequests.fromUserId} = ${viewerUserId} then ${connectionRequests.fromReadAt} else ${connectionRequests.toReadAt} end`
  const [last, unread] = await Promise.all([
    db.selectDistinctOn([messages.requestId]).from(messages).where(inArray(messages.requestId, ids)).orderBy(messages.requestId, desc(messages.createdAt)),
    db.select({ requestId: messages.requestId, unread: count() }).from(messages)
      .innerJoin(connectionRequests, eq(connectionRequests.id, messages.requestId))
      .where(and(inArray(messages.requestId, ids), ne(messages.senderUserId, viewerUserId), gt(messages.createdAt, sql`coalesce(${myReadAt}, '-infinity')`)))
      .groupBy(messages.requestId),
  ])
  const lastOf = new Map(last.map((m) => [m.requestId, m]))
  const unreadOf = new Map(unread.map((u) => [u.requestId, u.unread]))
  return rows
    .map(({ request, other, profile }) => {
      const lastMessage = lastOf.get(request.id)
      return {
        id: request.id,
        // A deleted account has no profile. A lister can have none: the web names the listing.
        other: {
          profileId: profile?.id ?? null, name: profile?.fullName ?? null, deleted: other.status === 'deleted',
          photoUrl: profile?.photoKeys[0] ? storage.publicUrl(profile.photoKeys[0]) : null,
        },
        listingId: request.listingId,
        lastMessage: lastMessage ? messageView(lastMessage, viewerUserId) : null,
        unread: unreadOf.get(request.id) ?? 0,
        canSend: other.status === 'active',
      }
    })
    .sort((a, b) => (b.lastMessage?.createdAt ?? '').localeCompare(a.lastMessage?.createdAt ?? ''))
}
