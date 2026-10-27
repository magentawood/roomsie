import type { FastifyInstance, FastifyReply } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, desc, eq, sql } from 'drizzle-orm'
import {
  conversationsResponse, errorResponse, message, messagesQuery, messagesResponse, noContent, realtimeResponse, sendMessageBody,
} from '@roomsie/contract'
import { ensureRealtimeClaims, requireUser, type AuthOptions } from '../auth'
import { messages } from '../db/schema'
import { idParams } from '../params'
import { userChannel } from '../realtime'
import { markRead } from '../requests/read'
import type { Storage } from '../storage'
import { conversationFor, listConversations, messageView } from './read'
import { sendLive } from './send'
import type { Messaging } from './settings'

const pageSize = 50

export function messageRoutes(v1: FastifyInstance, options: AuthOptions & { storage: Storage; messaging: Messaging }) {
  const { db, storage, messaging } = options
  const { alerts } = v1
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireUser(options)
  /** The conversation, or a 404 when the user is not in it. */
  const conversationOr404 = async (userId: string, conversationId: string, reply: FastifyReply) => {
    const conversation = await conversationFor(db, storage, userId, conversationId)
    if (!conversation) void reply.code(404).send({ error: 'not found' })
    return conversation
  }

  app.get('/conversations', { preHandler, schema: { response: { 200: conversationsResponse } } }, async (req) => ({
    conversations: await listConversations(db, storage, req.user!.id),
  }))

  app.get('/conversations/:id/messages', {
    preHandler,
    schema: { params: idParams, querystring: messagesQuery, response: { 200: messagesResponse, 404: errorResponse } },
  }, async (req, reply) => {
    const me = req.user!.id
    if (!await conversationOr404(me, req.params.id, reply)) return reply
    const { before } = req.query
    // The id breaks a tie of times. One extra row tells if an older page exists.
    const rows = await db.select().from(messages)
      .where(and(
        eq(messages.requestId, req.params.id),
        before ? sql`(${messages.createdAt}, ${messages.id}) < (select created_at, id from ${messages} where id = ${before})` : undefined,
      ))
      .orderBy(desc(messages.createdAt), desc(messages.id)).limit(pageSize + 1)
    return { messages: rows.slice(0, pageSize).map((m) => messageView(m, me)), hasMore: rows.length > pageSize }
  })

  app.post('/conversations/:id/messages', {
    preHandler,
    schema: { params: idParams, body: sendMessageBody, response: { 201: message, 404: errorResponse, 409: errorResponse } },
  }, async (req, reply) => {
    const me = req.user!.id
    const conversation = await conversationOr404(me, req.params.id, reply)
    if (!conversation) return reply
    if (!conversation.canSend) return reply.code(409).send({ error: 'the other person cannot get messages' })
    // ADR-0015: a retry stores nothing. PD17: a chat can carry a phone number.
    const [made] = await db.insert(messages).values({ id: req.body.id, requestId: req.params.id, senderUserId: me, text: req.body.text })
      .onConflictDoNothing().returning()
    if (made) {
      await sendLive(messaging.realtime, req.log, made, [me, conversation.otherUserId])
      alerts.message(made)
      return reply.code(201).send(messageView(made, me))
    }
    const [stored] = await db.select().from(messages).where(and(eq(messages.id, req.body.id), eq(messages.requestId, req.params.id), eq(messages.senderUserId, me)))
    return stored ? reply.code(201).send(messageView(stored, me)) : reply.code(409).send({ error: 'the id is taken' })
  })

  app.post('/conversations/:id/read', { preHandler, schema: { params: idParams, response: { 204: noContent, 404: errorResponse } } }, async (req, reply) => {
    const me = req.user!.id
    if (!await conversationOr404(me, req.params.id, reply)) return reply
    await markRead(db, req.params.id, me)
    return reply.code(204).send(null)
  })

  app.post('/me/realtime', { preHandler, schema: { response: { 200: realtimeResponse, 503: errorResponse } } }, async (req, reply) => {
    const { webRealtime, firebaseAdmin } = messaging
    if (!webRealtime || !firebaseAdmin) return reply.code(503).send({ error: 'realtime is not set up' })
    const mustRefreshIdToken = await ensureRealtimeClaims(req, firebaseAdmin)
    return { ...webRealtime, channel: userChannel(req.user!.id), mustRefreshIdToken }
  })
}
