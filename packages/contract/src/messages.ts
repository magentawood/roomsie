import { z } from 'zod'
import { clientId, requiredText } from './shared'

export const messageTextLimit = 2000

/** The client makes the id, so a retried send stores one message (ADR-0015). */
export const sendMessageBody = z.strictObject({ id: clientId, text: requiredText(messageTextLimit) })
export type SendMessageBody = z.infer<typeof sendMessageBody>

export const message = z.object({ id: z.uuid(), conversationId: z.uuid(), mine: z.boolean(), text: z.string(), createdAt: z.iso.datetime() })
export type Message = z.infer<typeof message>

/** The other person of a conversation. `deleted`: the account is deleted, and the web shows "Deleted user". */
const otherPerson = z.object({ profileId: z.uuid().nullable(), name: z.string().nullable(), photoUrl: z.url().nullable(), deleted: z.boolean() })

/** A conversation is an accepted message request (T-44). `canSend` is false when the other account is deleted or suspended. */
export const conversation = z.object({
  id: z.uuid(),
  other: otherPerson,
  listingId: z.uuid().nullable(),
  lastMessage: message.nullable(),
  unread: z.int().min(0),
  canSend: z.boolean(),
})
export type Conversation = z.infer<typeof conversation>
export const conversationsResponse = z.object({ conversations: z.array(conversation) })

/** The messages of a conversation, the newest first. `before` is the id of the oldest message of the last page. */
export const messagesQuery = z.object({ before: z.uuid().optional() })
export const messagesResponse = z.object({ messages: z.array(message), hasMore: z.boolean() })

/** The event on the private channel of a person: one new message, as that person sees it (T-44). */
export const realtimeMessageEvent = z.object({ event: z.literal('message'), payload: message })
export type RealtimeMessageEvent = z.infer<typeof realtimeMessageEvent>

/** What the web needs to join its private channel. `refreshToken`: get a fresh ID token first, so that it has the claims. */
export const realtimeResponse = z.object({ url: z.url(), key: z.string().min(1), channel: z.string(), refreshToken: z.boolean() })
export type RealtimeResponse = z.infer<typeof realtimeResponse>
