import type { FastifyBaseLogger } from 'fastify'
import type { Tx } from '../db/client'
import { messages } from '../db/schema'
import type { Realtime } from '../realtime'
import { messageView, type MessageRow } from './read'

/** The note of an accepted request opens the conversation, as the first message of its sender. In the transaction of the accept, now() is the time of the accept (T-44). */
export async function openConversation(tx: Tx, note: { requestId: string; senderUserId: string; text: string }) {
  const [row] = await tx.insert(messages).values(note).returning()
  return row!
}

/** Sends a message live to the two people. Realtime is best effort: the message is already saved. */
export async function sendLive(realtime: Realtime, log: FastifyBaseLogger, row: MessageRow, userIds: string[]) {
  await Promise.all(userIds.map((userId) => realtime.send(userId, { event: 'message', payload: messageView(row, userId) })
    .catch((err: unknown) => log.error({ err }, 'realtime'))))
}
