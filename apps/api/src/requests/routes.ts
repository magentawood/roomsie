import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, desc, eq, lte, ne } from 'drizzle-orm'
import {
  errorResponse, incomingRequestsResponse, noContent, outgoingRequest, outgoingRequestsResponse, requestCapMessage, requestDailyLimit, sendRequestBody,
  type SendRequestBody,
} from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import type { Db } from '../db/client'
import { connectionRequests, listings, messages, profiles, users } from '../db/schema'
import { visibleListing } from '../listings/read'
import { visiblePeople } from '../match/query'
import { idParams } from '../params'
import type { Storage } from '../storage'
import { sendLive } from '../messages/routes'
import type { Messaging } from '../messages/settings'
import { maskContacts } from '../text/mask-contacts'
import { betweenUsers, expiryCutoff, expiryMs, isOpen, openRequest, sentToday, type RequestRow } from './read'

const outgoingView = (r: RequestRow) => ({
  id: r.id, toProfileId: r.toProfileId, listingId: r.listingId, createdAt: r.createdAt.toISOString(),
  state: r.status === 'accepted' ? 'accepted' as const : isOpen(r) ? 'open' as const : 'not_available' as const,
})

/** The user who gets the request, or nothing when the target is not visible to the sender. */
async function recipientOf(db: Db, senderUserId: string, body: SendRequestBody) {
  const [to] = 'toProfileId' in body
    ? await db.select({ userId: profiles.userId }).from(profiles).innerJoin(users, eq(users.id, profiles.userId))
      .where(and(eq(profiles.id, body.toProfileId), ...visiblePeople(senderUserId)))
    : await db.select({ userId: listings.ownerUserId }).from(listings).innerJoin(users, eq(users.id, listings.ownerUserId))
      .where(and(
        eq(listings.id, body.listingId), visibleListing(senderUserId), eq(users.status, 'active'), ne(listings.ownerUserId, senderUserId),
      ))
  return to?.userId
}

export function requestRoutes(v1: FastifyInstance, options: AuthOptions & { storage: Storage; messaging: Messaging }) {
  const { db, storage, messaging } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireUser(options)
  const answerable = (userId: string) => and(eq(connectionRequests.toUserId, userId), openRequest())

  app.post('/requests', {
    preHandler,
    schema: { body: sendRequestBody, response: { 201: outgoingRequest, 403: errorResponse, 404: errorResponse, 409: errorResponse, 429: errorResponse } },
  }, async (req, reply) => {
    const userId = req.user!.id
    const [senderProfile] = await db.select({ id: profiles.id, hiddenAt: profiles.hiddenAt }).from(profiles).where(eq(profiles.userId, userId))
    if (!senderProfile) return reply.code(409).send({ error: 'no profile' })
    // T-19: reports hid the card, so the person reaches nobody new until a moderator reviews it.
    if (senderProfile.hiddenAt) return reply.code(403).send({ error: 'Your card is hidden for review.' })
    const toUserId = await recipientOf(db, userId, req.body)
    if (!toUserId) return reply.code(404).send({ error: 'not found' })
    const pair = betweenUsers(userId, toUserId)
    const made = await db.transaction(async (tx) => {
      // The lock makes two requests at the same time count each other.
      await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update')
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
    return reply.code(201).send(outgoingView(made))
  })

  app.get('/requests/outgoing', { preHandler, schema: { response: { 200: outgoingRequestsResponse } } }, async (req) => {
    const rows = await db.select().from(connectionRequests)
      .where(eq(connectionRequests.fromUserId, req.user!.id)).orderBy(desc(connectionRequests.createdAt))
    return { requests: rows.map(outgoingView) }
  })

  app.get('/requests/incoming', { preHandler, schema: { response: { 200: incomingRequestsResponse } } }, async (req) => {
    const incoming = await db.select({ request: connectionRequests, profileId: profiles.id, name: profiles.fullName, photoKeys: profiles.photoKeys })
      .from(connectionRequests).innerJoin(profiles, eq(profiles.id, connectionRequests.fromProfileId))
      .where(answerable(req.user!.id)).orderBy(desc(connectionRequests.createdAt))
    return {
      requests: incoming.map(({ request: r, profileId, name, photoKeys: [photo] }) => ({
        id: r.id, listingId: r.listingId, note: r.note,
        from: { profileId, name, photoUrl: photo ? storage.publicUrl(photo) : null },
        createdAt: r.createdAt.toISOString(), expiresAt: new Date(r.createdAt.getTime() + expiryMs).toISOString(),
      })),
    }
  })

  for (const [action, status] of [['accept', 'accepted'], ['decline', 'declined']] as const) {
    app.post(`/requests/:id/${action}`, {
      preHandler,
      schema: { params: idParams, response: { 204: noContent, 404: errorResponse } },
    }, async (req, reply) => {
      const answered = await db.transaction(async (tx) => {
        const [request] = await tx.update(connectionRequests).set({ status, respondedAt: new Date() })
          .where(and(eq(connectionRequests.id, req.params.id), answerable(req.user!.id))).returning()
        if (!request || status === 'declined') return request && { request, note: null }
        // T-44: the note opens the conversation, as the first message of its sender.
        const [note] = await tx.insert(messages).values({ requestId: request.id, senderUserId: request.fromUserId, text: request.note, createdAt: request.createdAt }).returning()
        return { request, note: note! }
      })
      if (!answered) return reply.code(404).send({ error: 'not found' })
      if (answered.note) await sendLive(messaging.realtime, req.log, answered.note, [answered.request.fromUserId, answered.request.toUserId])
      return reply.code(204).send(null)
    })
  }
}
