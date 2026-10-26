import { z } from 'zod'

/** The seven report reasons of PD18. */
export const reportReasons = ['fake', 'broker_or_spam', 'harassment', 'discriminatory_text', 'under_18', 'contact_details', 'other'] as const
export type ReportReason = (typeof reportReasons)[number]
/** "Other" needs a detail (PD18). */
export const needsDetail = (reason: ReportReason) => reason === 'other'
export const reportDetailLimit = 500

const idClockSkew = 5 * 60_000
/** The time in a UUIDv7: its first 48 bits, in milliseconds. */
const uuidv7Time = (id: string) => parseInt(id.replaceAll('-', '').slice(0, 12), 16)
/** An id that the client makes: a UUIDv7 with a time at most 5 minutes from the server clock (ADR-0015). */
export const clientId = z.uuid({ version: 'v7' })
  .refine((id) => Math.abs(Date.now() - uuidv7Time(id)) <= idClockSkew, 'The time in the id is more than 5 minutes off')

export const reportBody = z.strictObject({
  id: clientId,
  listingId: z.uuid(),
  reason: z.enum(reportReasons),
  detail: z.string().trim().min(1).max(reportDetailLimit).nullable().default(null),
}).refine((r) => !needsDetail(r.reason) || r.detail !== null, { message: 'Other needs a detail', path: ['detail'] })
export type ReportBody = z.input<typeof reportBody>
