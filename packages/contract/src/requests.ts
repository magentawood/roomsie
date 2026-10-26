import { z } from 'zod'
import { requiredText } from './shared'

export const requestNoteLimit = 300

const note = requiredText(requestNoteLimit)
export const sendRequestBody = z.union([z.strictObject({ toProfileId: z.uuid(), note }), z.strictObject({ listingId: z.uuid(), note })])
export type SendRequestBody = z.infer<typeof sendRequestBody>

/** What the sender sees. A decline and an expiry are both "not_available" (PD17). */
export const outgoingRequest = z.object({
  id: z.uuid(),
  toProfileId: z.uuid().nullable(),
  listingId: z.uuid().nullable(),
  state: z.enum(['open', 'accepted', 'not_available']),
  createdAt: z.iso.datetime(),
})
export const outgoingRequestsResponse = z.object({ requests: z.array(outgoingRequest) })

export const incomingRequest = z.object({
  id: z.uuid(),
  from: z.object({ profileId: z.uuid(), name: z.string(), photoUrl: z.url().nullable() }),
  listingId: z.uuid().nullable(),
  note: z.string(),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
})
export const incomingRequestsResponse = z.object({ requests: z.array(incomingRequest) })
