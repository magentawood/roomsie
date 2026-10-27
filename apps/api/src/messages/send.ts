import type { FastifyBaseLogger } from 'fastify'
import type { Tx } from '../db/client'
import { connectionRequests, messages } from '../db/schema'
import type { Realtime } from '../realtime'
import { messageView } from './read'

type MessageRow = typeof messages.$inferSelect

/** The note of an accepted request opens the conversation, as the first message of its sender (T-44). */
export async function openConversation(tx: Tx, request: typeof connectionRequests.$inferSelect) {
  const [note] = await tx.insert(messages).values({ requestId: request.id, senderUserId: request.fromUserId, text: request.note, createdAt: request.createdAt }).returning()
  return note!
}

/** Sends a message live to the two people. Realtime is best effort: the message is already saved. */
export async function sendLive(realtime: Realtime, log: FastifyBaseLogger, row: MessageRow, userIds: string[]) {
  await Promise.all(userIds.map((userId) => realtime.send(userId, { event: 'message', payload: messageView(row, userId) })
    .catch((err: unknown) => log.error({ err }, 'realtime'))))
}
