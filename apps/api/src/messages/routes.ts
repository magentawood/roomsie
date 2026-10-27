import type { FastifyBaseLogger, FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, desc, eq, lt } from 'drizzle-orm'
import {
  conversation, conversationsResponse, errorResponse, message, messagesQuery, messagesResponse, noContent, realtimeResponse, sendMessageBody,
} from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import { connectionRequests, messages } from '../db/schema'
import { idParams } from '../params'
import { userChannel, type Realtime } from '../realtime'
import type { Storage } from '../storage'
import { maskContacts } from '../text/mask-contacts'
import { listConversations, messageView, participantOf } from './read'
import type { Messaging } from './settings'

const pageSize = 50

/** Sends a message live to the two people. Realtime is best effort: the message is already saved. */
export async function sendLive(realtime: Realtime, log: FastifyBaseLogger, row: typeof messages.$inferSelect, userIds: string[]) {
  await Promise.all(userIds.map((userId) => realtime.send(userId, 'message', messageView(row, userId)).catch((err: unknown) => log.error({ err }, 'realtime'))))
}

export function messageRoutes(v1: FastifyInstance, options: AuthOptions & { storage: Storage; messaging: Messaging }) {
  const { db, storage, messaging } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireUser(options)
  const notFound = { error: 'not found' }

  app.get('/conversations', { preHandler, schema: { response: { 200: conversationsResponse } } }, async (req) => ({
    conversations: await listConversations(db, storage, req.user!.id),
  }))

  app.get('/conversations/:id', { preHandler, schema: { params: idParams, response: { 200: conversation, 404: errorResponse } } }, async (req, reply) => {
    const [found] = await listConversations(db, storage, req.user!.id, req.params.id)
    return found ?? reply.code(404).send(notFound)
  })

  app.get('/conversations/:id/messages', {
    preHandler,
    schema: { params: idParams, querystring: messagesQuery, response: { 200: messagesResponse, 404: errorResponse } },
  }, async (req, reply) => {
    const me = req.user!.id
    if (!await participantOf(db, me, req.params.id)) return reply.code(404).send(notFound)
    const { before } = req.query
    // One more than a page tells if an older page exists.
    const rows = await db.select().from(messages)
      .where(and(eq(messages.requestId, req.params.id), before ? lt(messages.createdAt, new Date(before)) : undefined))
      .orderBy(desc(messages.createdAt)).limit(pageSize + 1)
    return { messages: rows.slice(0, pageSize).map((m) => messageView(m, me)), hasMore: rows.length > pageSize }
  })

  app.post('/conversations/:id/messages', {
    preHandler,
    schema: { params: idParams, body: sendMessageBody, response: { 201: message, 404: errorResponse, 409: errorResponse } },
  }, async (req, reply) => {
    const me = req.user!.id
    const found = await participantOf(db, me, req.params.id)
    if (!found) return reply.code(404).send(notFound)
    if (!found.canSend) return reply.code(409).send({ error: 'the other person cannot get messages' })
    // ADR-0015: a retried send stores nothing, and gives the stored message again.
    const [made] = await db.insert(messages).values({ id: req.body.id, requestId: req.params.id, senderUserId: me, text: maskContacts(req.body.text) })
      .onConflictDoNothing().returning()
    if (made) {
      await sendLive(messaging.realtime, req.log, made, [me, found.otherUserId])
      return reply.code(201).send(messageView(made, me))
    }
    const [stored] = await db.select().from(messages).where(and(eq(messages.id, req.body.id), eq(messages.requestId, req.params.id), eq(messages.senderUserId, me)))
    return stored ? reply.code(201).send(messageView(stored, me)) : reply.code(409).send({ error: 'the id is taken' })
  })

  app.post('/conversations/:id/read', { preHandler, schema: { params: idParams, response: { 204: noContent, 404: errorResponse } } }, async (req, reply) => {
    const me = req.user!.id
    const found = await participantOf(db, me, req.params.id)
    if (!found) return reply.code(404).send(notFound)
    const now = new Date()
    await db.update(connectionRequests).set(found.request.fromUserId === me ? { fromReadAt: now } : { toReadAt: now })
      .where(eq(connectionRequests.id, req.params.id))
    return reply.code(204).send(null)
  })

  app.post('/me/realtime', { preHandler, schema: { response: { 200: realtimeResponse, 503: errorResponse } } }, async (req, reply) => {
    const { realtimeClient, firebaseAdmin } = messaging
    if (!realtimeClient || !firebaseAdmin) return reply.code(503).send({ error: 'realtime is not set up' })
    const me = req.user!.id
    const { uid, role, userId } = req.firebase!
    // Supabase trusts a Firebase token only with these claims. A new claim shows in the next token, so the web refreshes it.
    const refreshToken = role !== 'authenticated' || userId !== me
    if (refreshToken) await firebaseAdmin.setClaims(uid, { role: 'authenticated', user_id: me })
    return { ...realtimeClient, channel: userChannel(me), refreshToken }
  })
}

