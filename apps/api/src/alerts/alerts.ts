import type { FastifyBaseLogger } from 'fastify'
import { and, eq, gt, ne } from 'drizzle-orm'
import { listingTitle } from '@roomsie/contract'
import type { Db } from '../db/client'
import { connectionRequests, listings, messages, profiles, pushTokens, users } from '../db/schema'
import type { Mailer } from '../email'
import type { FirebaseAdmin } from '../firebase-admin'
import type { MessageRow } from '../messages/read'
import type { RequestRow } from '../requests/read'
import { alertMail, alertTitle, type Alert } from './texts'

/** A person who read the chat this recently is in it, so a message sends no alert (PD17). */
const quietMs = 5 * 60_000

export type Alerts = {
  request(request: RequestRow): void
  accept(request: RequestRow): void
  message(message: MessageRow): void
  /** The result of an ID check (T-46). */
  verification(userId: string, result: 'verified' | 'rejected'): void
  /** Waits for the alerts that are on their way: at a shutdown, and in the tests. */
  settled(): Promise<void>
}

/**
 * The email and the push of a new request, an accept or a message (T-55). The API saves first and alerts after the reply:
 * an alert is best effort, so a failure goes to the log.
 */
export function alertsOf(options: { db: Db; mailer: Mailer; firebaseAdmin: FirebaseAdmin | null; webOrigin: string; log: FastifyBaseLogger }): Alerts {
  const { db, mailer, firebaseAdmin, webOrigin, log } = options
  const pending = new Set<Promise<void>>()
  // setImmediate: the route sends its reply first.
  const later = (work: () => Promise<void>) => {
    const done: Promise<void> = new Promise((next) => setImmediate(next)).then(work)
      .catch((err: unknown) => log.error({ err }, 'alerts')).finally(() => pending.delete(done))
    pending.add(done)
  }
  const chatLink = (requestId: string) => `${webOrigin}/messages/${requestId}`

  /** A first name, or the title of the listing for a lister with no profile. */
  async function nameOf(userId: string, listingId: string | null) {
    const [profile] = await db.select({ name: profiles.fullName }).from(profiles).where(eq(profiles.userId, userId))
    if (profile) return profile.name.split(' ')[0]!
    const [listing] = listingId
      ? await db.select({ kind: listings.kind, pgName: listings.pgName, placeType: listings.placeType, roomType: listings.roomType }).from(listings).where(eq(listings.id, listingId))
      : []
    return listing ? listingTitle({ ...listing, roomType: listing.roomType === 'unclear' ? null : listing.roomType }) : 'A lister'
  }

  async function tell(userId: string, alert: Alert) {
    const [user] = await db.select({ status: users.status, email: users.email, emailAlerts: users.emailAlerts }).from(users).where(eq(users.id, userId))
    if (user?.status !== 'active') return
    const tokens = firebaseAdmin ? await db.select({ token: pushTokens.token }).from(pushTokens).where(eq(pushTokens.userId, userId)) : []
    const sends = await Promise.allSettled([
      user.emailAlerts && user.email ? mailer.send(user.email, alertMail(alert, `${webOrigin}/profile`)) : null,
      ...tokens.map(async ({ token }) => {
        if (await firebaseAdmin!.sendPush(token, { title: alertTitle(alert), link: alert.link }) === 'gone') await db.delete(pushTokens).where(eq(pushTokens.token, token))
      }),
    ])
    for (const send of sends) if (send.status === 'rejected') log.error({ err: send.reason }, 'alerts')
  }

  return {
    request: (request) => later(async () => tell(request.toUserId, { kind: 'request', name: await nameOf(request.fromUserId, null), link: `${webOrigin}/messages/requests` })),
    accept: (request) => later(async () => tell(request.fromUserId, { kind: 'accept', name: await nameOf(request.toUserId, request.listingId), link: chatLink(request.id) })),
    message: (message) => later(async () => {
      const [request] = await db.select().from(connectionRequests).where(eq(connectionRequests.id, message.requestId))
      if (!request) return
      // The sender of the request reads from the "from" side.
      const toSender = message.senderUserId === request.toUserId
      const readAt = toSender ? request.fromReadAt : request.toReadAt
      const quietSince = message.createdAt.getTime() - quietMs
      if (readAt && readAt.getTime() > quietSince) return
      // The accept alert counts as the alert of the chat (PD17).
      if (toSender && request.respondedAt && request.respondedAt.getTime() > quietSince) return
      const [unread] = await db.select({ id: messages.id }).from(messages).where(and(
        eq(messages.requestId, request.id), eq(messages.senderUserId, message.senderUserId), ne(messages.id, message.id),
        readAt ? gt(messages.createdAt, readAt) : undefined,
      )).limit(1)
      if (unread) return
      await tell(toSender ? request.fromUserId : request.toUserId, { kind: 'message', name: await nameOf(message.senderUserId, request.listingId), link: chatLink(request.id) })
    }),
    verification: (userId, result) => later(() => tell(userId, { kind: result, link: `${webOrigin}/profile` })),
    async settled() {
      while (pending.size) await Promise.all(pending)
    },
  }
}
