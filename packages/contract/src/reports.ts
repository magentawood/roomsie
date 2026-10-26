import { z } from 'zod'
import { optionalText } from './shared'

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

const report = { id: clientId, reason: z.enum(reportReasons), detail: optionalText(reportDetailLimit).default(null) }
/** A report of a listing, or of a person through the profile id (T-19). */
export const reportBody = z.union([z.strictObject({ ...report, listingId: z.uuid() }), z.strictObject({ ...report, profileId: z.uuid() })])
  .refine((r) => !needsDetail(r.reason) || r.detail !== null, { message: 'Other needs a detail', path: ['detail'] })
export type ReportBody = z.input<typeof reportBody>

export const blockBody = z.strictObject({ id: clientId, profileId: z.uuid() })
