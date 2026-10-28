import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, desc, eq, lte, sql } from 'drizzle-orm'
import {
  errorResponse, incomingRequestsResponse, noContent, outgoingRequest, outgoingRequestsResponse, requestCapMessage, requestDailyLimit, sendRequestBody,
  type SendRequestBody,
} from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'
import { requireUser, type AuthOptions } from '../auth'
import type { Db } from '../db/client'
import { connectionRequests } from '../db/schema'
import { ownerOfVisibleListing } from '../listings/read'
import { peopleOf, profileOf, profilesByIds, visibleCards } from '../profiles/read'
import { idParams } from '../params'
import { firstPhotoUrl, type Storage } from '../storage'
import { openConversation, sendLive } from '../messages/send'
import type { Messaging } from '../messages/settings'
import { maskContacts } from '../text/mask-contacts'
import { lockAccount } from '../users'
import { betweenUsers, expiryCutoff, expiryMs, isOpen, openRequest, sentToday, type RequestRow } from './read'

/** Each sent request with the person who gets it, as a conversation shows the other person. */
async function outgoingViews(db: Db, storage: Storage, rows: RequestRow[]) {
  const people = await peopleOf(db, storage, rows.map((r) => r.toUserId))
  return rows.map((r) => {
    const { profileId, name, photoUrl, deleted } = people.get(r.toUserId)!
    return {
      id: r.id, toProfileId: r.toProfileId, listingId: r.listingId, note: r.note, createdAt: r.createdAt.toISOString(), to: { profileId, name, photoUrl, deleted },
      state: r.status === 'accepted' ? 'accepted' as const : isOpen(r) ? 'open' as const : 'not_available' as const,
    }
  })
}

/** The user who gets the request, or nothing when the target is not visible to the sender. */
async function recipientOf(db: Db, senderUserId: string, body: SendRequestBody) {
  const [to] = 'toProfileId' in body
    ? await visibleCards(db, senderUserId, [body.toProfileId])
    : await ownerOfVisibleListing(db, body.listingId, senderUserId, { activeOwner: true })
  return to?.userId
}

export function requestRoutes(v1: FastifyInstance, options: AuthOptions & { storage: Storage; messaging: Messaging }) {
  const { db, storage, messaging } = options
  const { alerts, analytics } = v1
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireUser(options)
  const answerable = (userId: string) => and(eq(connectionRequests.toUserId, userId), openRequest())

  app.post('/requests', {
    preHandler,
    schema: { body: sendRequestBody, response: { 201: outgoingRequest, 403: errorResponse, 404: errorResponse, 409: errorResponse, 429: errorResponse } },
  }, async (req, reply) => {
    const userId = req.user!.id
    const senderProfile = await profileOf(db, userId)
    if (!senderProfile) return reply.code(409).send({ error: 'no profile' })
    // T-19: reports hid the card, so the person reaches nobody new until a moderator reviews it.
    if (senderProfile.hiddenAt) return reply.code(403).send({ error: 'Your card is hidden for review.' })
    const toUserId = await recipientOf(db, userId, req.body)
    if (!toUserId) return reply.code(404).send({ error: 'not found' })
    const pair = betweenUsers(userId, toUserId)
    const made = await db.transaction(async (tx) => {
      // The lock makes two requests at the same time count each other.
      await lockAccount(tx, userId)
      if (await sentToday(tx, userId) >= requestDailyLimit) return 'limit' as const
      // An expired request frees the pair for a new one.
      await tx.update(connectionRequests).set({ status: 'expired' })
        .where(and(pair, eq(connectionRequests.status, 'pending'), lte(connectionRequests.createdAt, expiryCutoff())))
      const [row] = await tx.insert(connectionRequests).values({
        ...req.body, fromUserId: userId, fromProfileId: senderProfile.id, toUserId, note: maskContacts(req.body.note),
      }).onConflictDoNothing().returning()
      return row
    })
    if (made === 'limit') return reply.code(429).send({ error: requestCapMessage })
    if (!made) return reply.code(409).send({ error: 'a request between you is open or accepted' })
    // Realtime is best effort: the request is already saved.
    await messaging.realtime.send(toUserId, { event: 'request', payload: { id: made.id } }).catch((err: unknown) => reportError(err, { where: 'realtime', userId: req.user!.id, log: req.log }))
    const view = (await outgoingViews(db, storage, [made]))[0]!
    alerts.request(made)
    analytics.track(req, { name: 'connect_sent', to: made.listingId ? 'listing' : 'person' })
    return reply.code(201).send(view)
  })

  app.get('/requests/outgoing', { preHandler, schema: { response: { 200: outgoingRequestsResponse } } }, async (req) => {
    const rows = await db.select().from(connectionRequests)
      .where(eq(connectionRequests.fromUserId, req.user!.id)).orderBy(desc(connectionRequests.createdAt))
    return { requests: await outgoingViews(db, storage, rows) }
  })

  app.get('/requests/incoming', { preHandler, schema: { response: { 200: incomingRequestsResponse } } }, async (req) => {
    const rows = await db.select().from(connectionRequests).where(answerable(req.user!.id)).orderBy(desc(connectionRequests.createdAt))
    const senders = new Map((await profilesByIds(db, rows.flatMap((r) => (r.fromProfileId ? [r.fromProfileId] : [])))).map((p) => [p.id, p]))
    return {
      // An account deletion withdraws its open requests, so each sender here has a profile. The rare miss is skipped, as the inner join did.
      requests: rows.flatMap((r) => {
        const from = r.fromProfileId ? senders.get(r.fromProfileId) : undefined
        return from
          ? [{
              id: r.id, listingId: r.listingId, note: r.note,
              from: { profileId: from.id, name: from.fullName, photoUrl: firstPhotoUrl(storage, from.photoKeys) },
              createdAt: r.createdAt.toISOString(), expiresAt: new Date(r.createdAt.getTime() + expiryMs).toISOString(),
            }]
          : []
      }),
    }
  })

  for (const [action, status] of [['accept', 'accepted'], ['decline', 'declined']] as const) {
    app.post(`/requests/:id/${action}`, {
      preHandler,
      schema: { params: idParams, response: { 204: noContent, 404: errorResponse } },
    }, async (req, reply) => {
      const answered = await db.transaction(async (tx) => {
        // The clock of Postgres, as for each message. The person who accepts has read the note.
        const now = sql`now()`
        const [request] = await tx.update(connectionRequests).set({ status, respondedAt: now, ...(status === 'accepted' && { toReadAt: now }) })
          .where(and(eq(connectionRequests.id, req.params.id), answerable(req.user!.id))).returning()
        if (!request || status === 'declined') return request && { request, note: null }
        return { request, note: await openConversation(tx, { requestId: request.id, senderUserId: request.fromUserId, text: request.note }) }
      })
      if (!answered) return reply.code(404).send({ error: 'not found' })
      if (answered.note) {
        await sendLive(messaging.realtime, req, answered.note, [answered.request.fromUserId, answered.request.toUserId])
        alerts.accept(answered.request)
        analytics.track(req, { name: 'connect_accepted', to: answered.request.listingId ? 'listing' : 'person' })
      }
      return reply.code(204).send(null)
    })
  }
}
