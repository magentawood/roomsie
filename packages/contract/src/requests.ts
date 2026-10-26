import { z } from 'zod'

export const requestNoteLimit = 300

export const sendRequestBody = z.strictObject({
  toProfileId: z.uuid().optional(),
  listingId: z.uuid().optional(),
  note: z.string().trim().min(1).max(requestNoteLimit),
}).refine((b) => (b.toProfileId === undefined) !== (b.listingId === undefined), 'Give a person or a listing')
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
