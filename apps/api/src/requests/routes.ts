import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, count, desc, eq, gt, gte, lte, ne, or, sql } from 'drizzle-orm'
import {
  errorResponse, incomingRequestsResponse, noContent, outgoingRequest, outgoingRequestsResponse, sendRequestBody,
  type SendRequestBody,
} from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import type { Db } from '../db/client'
import { connectionRequests, listings, profiles, users } from '../db/schema'
import { visibleListing } from '../listings/read'
import { noBlockBetween, visiblePeople } from '../match/query'
import { idParams } from '../params'
import type { Storage } from '../storage'
import { maskContacts } from '../text/mask-contacts'

type RequestRow = typeof connectionRequests.$inferSelect

/** PD17: a request with no answer expires after 14 days, and a sender starts 10 a day. */
const expiryMs = 14 * 86_400_000
const dailyLimit = 10
const expiryCutoff = () => new Date(Date.now() - expiryMs)

const isOpen = (r: RequestRow) => r.status === 'pending' && r.createdAt > expiryCutoff()
const outgoingView = (r: RequestRow) => ({
  id: r.id, toProfileId: r.toProfileId, listingId: r.listingId, createdAt: r.createdAt.toISOString(),
  state: r.status === 'accepted' ? 'accepted' as const : isOpen(r) ? 'open' as const : 'not_available' as const,
})

/** The user who gets the request, or nothing when the target is not visible to the sender. */
async function recipientOf(db: Db, senderUserId: string, { toProfileId, listingId }: SendRequestBody) {
  const [to] = toProfileId
    ? await db.select({ userId: profiles.userId }).from(profiles).innerJoin(users, eq(users.id, profiles.userId))
      .where(and(eq(profiles.id, toProfileId), ...visiblePeople(senderUserId)))
    : await db.select({ userId: listings.ownerUserId }).from(listings).innerJoin(users, eq(users.id, listings.ownerUserId))
      .where(and(
        eq(listings.id, listingId!), visibleListing(), eq(users.status, 'active'),
        ne(listings.ownerUserId, senderUserId), noBlockBetween(senderUserId, listings.ownerUserId),
      ))
  return to?.userId
}

export function requestRoutes(v1: FastifyInstance, options: AuthOptions & { storage: Storage }) {
  const { db, storage } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireUser(options)
  const answerable = (userId: string) => [
    eq(connectionRequests.toUserId, userId), eq(connectionRequests.status, 'pending'), gt(connectionRequests.createdAt, expiryCutoff()),
  ]

  app.post('/requests', {
    preHandler,
    schema: { body: sendRequestBody, response: { 201: outgoingRequest, 404: errorResponse, 409: errorResponse, 429: errorResponse } },
  }, async (req, reply) => {
    const userId = req.user!.id
    const [senderProfile] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId))
    if (!senderProfile) return reply.code(409).send({ error: 'no profile' })
    const toUserId = await recipientOf(db, userId, req.body)
    if (!toUserId) return reply.code(404).send({ error: 'not found' })
    const pair = or(
      and(eq(connectionRequests.fromUserId, userId), eq(connectionRequests.toUserId, toUserId)),
      and(eq(connectionRequests.fromUserId, toUserId), eq(connectionRequests.toUserId, userId)),
    )
    const sent = await db.transaction(async (tx) => {
      // The lock makes two requests at the same time count each other.
      await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update')
      const [today] = await tx.select({ sent: count() }).from(connectionRequests)
        .where(and(eq(connectionRequests.fromUserId, userId), gte(connectionRequests.createdAt, sql`date_trunc('day', now(), 'Asia/Kolkata')`)))
      if (today!.sent >= dailyLimit) return 'limit' as const
      // An expired request frees the pair for a new one.
      await tx.update(connectionRequests).set({ status: 'expired' })
        .where(and(pair, eq(connectionRequests.status, 'pending'), lte(connectionRequests.createdAt, expiryCutoff())))
      const [made] = await tx.insert(connectionRequests).values({
        fromUserId: userId, fromProfileId: senderProfile.id, toUserId, toProfileId: req.body.toProfileId, listingId: req.body.listingId,
        note: maskContacts(req.body.note),
      }).onConflictDoNothing().returning()
      return made
    })
    if (sent === 'limit') return reply.code(429).send({ error: `You can send ${dailyLimit} new requests a day. Try again tomorrow.` })
    if (!sent) return reply.code(409).send({ error: 'a request between you is open or accepted' })
    return reply.code(201).send(outgoingView(sent))
  })

  app.get('/requests/outgoing', { preHandler, schema: { response: { 200: outgoingRequestsResponse } } }, async (req) => {
    const sent = await db.select().from(connectionRequests)
      .where(eq(connectionRequests.fromUserId, req.user!.id)).orderBy(desc(connectionRequests.createdAt))
    return { requests: sent.map(outgoingView) }
  })

  app.get('/requests/incoming', { preHandler, schema: { response: { 200: incomingRequestsResponse } } }, async (req) => {
    const incoming = await db.select({ request: connectionRequests, name: profiles.fullName, photoKeys: profiles.photoKeys })
      .from(connectionRequests).innerJoin(profiles, eq(profiles.id, connectionRequests.fromProfileId))
      .where(and(...answerable(req.user!.id))).orderBy(desc(connectionRequests.createdAt))
    return {
      requests: incoming.map(({ request: r, name, photoKeys: [photo] }) => ({
        id: r.id, listingId: r.listingId, note: r.note,
        from: { profileId: r.fromProfileId, name, photoUrl: photo ? storage.publicUrl(photo) : null },
        createdAt: r.createdAt.toISOString(), expiresAt: new Date(r.createdAt.getTime() + expiryMs).toISOString(),
      })),
    }
  })

  for (const [action, status] of [['accept', 'accepted'], ['decline', 'declined']] as const) {
    app.post(`/requests/:id/${action}`, {
      preHandler,
      schema: { params: idParams, response: { 204: noContent, 404: errorResponse } },
    }, async (req, reply) => {
      const [answered] = await db.update(connectionRequests).set({ status, respondedAt: new Date() })
        .where(and(eq(connectionRequests.id, req.params.id), ...answerable(req.user!.id))).returning({ id: connectionRequests.id })
      if (!answered) return reply.code(404).send({ error: 'not found' })
      return reply.code(204).send(null)
    })
  }
}
