import { z } from 'zod'
import { otherPerson } from './messages'
import { cardResponse } from './profiles'
import { requiredText } from './shared'

export const requestNoteLimit = 300
/** PD17: a sender starts this many requests a day, and a request with no answer expires after this many days. */
export const requestDailyLimit = 10
export const requestExpiryDays = 14
export const requestCapMessage = `You can send ${requestDailyLimit} new requests a day. Try again tomorrow.`

const note = requiredText(requestNoteLimit)
export const sendRequestBody = z.union([z.strictObject({ toProfileId: z.uuid(), note }), z.strictObject({ listingId: z.uuid(), note })])
export type SendRequestBody = z.infer<typeof sendRequestBody>

/** What the sender sees. A decline and an expiry are both "not_available" (PD17). `note`: masked. */
export const outgoingRequest = z.object({
  id: z.uuid(),
  toProfileId: z.uuid().nullable(),
  listingId: z.uuid().nullable(),
  to: otherPerson,
  note: z.string(),
  state: z.enum(['open', 'accepted', 'not_available']),
  createdAt: z.iso.datetime(),
})
export type OutgoingRequest = z.infer<typeof outgoingRequest>
export const outgoingRequestsResponse = z.object({ requests: z.array(outgoingRequest) })

export const incomingRequest = z.object({
  id: z.uuid(),
  from: z.object({ profileId: z.uuid(), name: z.string(), photoUrl: z.url().nullable() }),
  listingId: z.uuid().nullable(),
  note: z.string(),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
})
export type IncomingRequest = z.infer<typeof incomingRequest>
export const incomingRequestsResponse = z.object({ requests: z.array(incomingRequest) })

/** The connection between the viewer and a person (T-18b). "received": the person sent the viewer an open request. */
export const connection = z.discriminatedUnion('state', [
  z.object({ state: z.enum(['none', 'sent', 'accepted', 'not_available']) }),
  z.object({ state: z.literal('received'), requestId: z.uuid(), note: z.string() }),
])
export type Connection = z.infer<typeof connection>
/** The person detail: the card, the connection with the viewer, and the new requests that the viewer can send today. */
export const personResponse = cardResponse.extend({ connection, requestsLeftToday: z.int().min(0) })
export type PersonResponse = z.infer<typeof personResponse>
