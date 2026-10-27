import { and, count, desc, eq, gt, gte, or, sql } from 'drizzle-orm'
import { requestExpiryDays, type Connection } from '@roomsie/contract'
import type { Db, Tx } from '../db/client'
import { connectionRequests } from '../db/schema'
import { noBlockBetween } from '../match/query'

export type RequestRow = typeof connectionRequests.$inferSelect

export const expiryMs = requestExpiryDays * 86_400_000
export const expiryCutoff = () => new Date(Date.now() - expiryMs)

/** A request with no answer, younger than 14 days. `openRequest` is the same rule in SQL. */
export const isOpen = (r: RequestRow) => r.status === 'pending' && r.createdAt > expiryCutoff()
export const openRequest = () => and(eq(connectionRequests.status, 'pending'), gt(connectionRequests.createdAt, expiryCutoff()))

/** The requests between two people, in either direction. */
export const betweenUsers = (a: string, b: string) => or(
  and(eq(connectionRequests.fromUserId, a), eq(connectionRequests.toUserId, b)),
  and(eq(connectionRequests.fromUserId, b), eq(connectionRequests.toUserId, a)),
)

/** The new requests of a sender in the calendar day of India time. */
export async function sentToday(db: Db | Tx, userId: string) {
  const [today] = await db.select({ requests: count() }).from(connectionRequests)
    .where(and(eq(connectionRequests.fromUserId, userId), gte(connectionRequests.createdAt, sql`date_trunc('day', now(), 'Asia/Kolkata')`)))
  return today!.requests
}

/** The connection between the viewer and a person, from the newest request between them (T-18b). */
export async function connectionWith(db: Db, viewerUserId: string, otherUserId: string): Promise<Connection> {
  const [newest] = await db.select().from(connectionRequests)
    .where(betweenUsers(viewerUserId, otherUserId)).orderBy(desc(connectionRequests.createdAt)).limit(1)
  const mine = newest?.fromUserId === viewerUserId
  if (!newest) return { state: 'none' }
  if (newest.status === 'accepted') return { state: 'accepted' }
  if (isOpen(newest)) return mine ? { state: 'sent' } : { state: 'received', requestId: newest.id, note: newest.note }
  // A decline and an expiry look the same to the sender, and a closed request to the viewer leaves no trace.
  return { state: mine ? 'not_available' : 'none' }
}

/** For a suspended or deleted person. The senders of the requests to the person see "not available", as after a decline. */
export async function endOpenRequests(tx: Tx, userId: string) {
  const open = eq(connectionRequests.status, 'pending')
  await tx.update(connectionRequests).set({ status: 'withdrawn' }).where(and(eq(connectionRequests.fromUserId, userId), open))
  await tx.update(connectionRequests).set({ status: 'declined', respondedAt: new Date() }).where(and(eq(connectionRequests.toUserId, userId), open))
}

export async function markRead(db: Db, requestId: string, userId: string) {
  // The clock of Postgres, as for each message.
  const now = sql`now()`
  await db.update(connectionRequests).set({ fromReadAt: now }).where(and(eq(connectionRequests.id, requestId), eq(connectionRequests.fromUserId, userId)))
  await db.update(connectionRequests).set({ toReadAt: now }).where(and(eq(connectionRequests.id, requestId), eq(connectionRequests.toUserId, userId)))
}

/**
 * The accepted requests of the viewer with no block between the two people: the conversations of T-44.
 * Each gives the other person and the last read of the viewer.
 */
export function acceptedRequestsOf(db: Db, viewerUserId: string, requestId?: string) {
  const viewerSent = sql`${connectionRequests.fromUserId} = ${viewerUserId}`
  const otherUserId = sql<string>`case when ${viewerSent} then ${connectionRequests.toUserId} else ${connectionRequests.fromUserId} end`
  return db.select({
    id: connectionRequests.id,
    listingId: connectionRequests.listingId,
    otherUserId,
    readAt: sql`case when ${viewerSent} then ${connectionRequests.fromReadAt} else ${connectionRequests.toReadAt} end`.mapWith(connectionRequests.fromReadAt),
  }).from(connectionRequests).where(and(
    eq(connectionRequests.status, 'accepted'),
    or(eq(connectionRequests.fromUserId, viewerUserId), eq(connectionRequests.toUserId, viewerUserId)),
    noBlockBetween(viewerUserId, otherUserId),
    requestId ? eq(connectionRequests.id, requestId) : undefined,
  ))
}
