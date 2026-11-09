import { z } from 'zod'
import { clientId, optionalText } from './shared'

/** The seven report reasons of PD18. */
export const reportReasons = ['fake', 'broker_or_spam', 'harassment', 'discriminatory_text', 'under_18', 'contact_details', 'other'] as const
export type ReportReason = (typeof reportReasons)[number]
export const reportStatuses = ['open', 'actioned', 'dismissed'] as const
export type ReportStatus = (typeof reportStatuses)[number]
/** "Other" needs a detail (PD18). */
export const needsDetail = (reason: ReportReason) => reason === 'other'
export const reportDetailLimit = 500

const report = { id: clientId, reason: z.enum(reportReasons), detail: optionalText(reportDetailLimit).default(null) }
/** A report of a listing, or of a person through the profile id (T-19). */
export const reportBody = z.union([z.strictObject({ ...report, listingId: z.uuid() }), z.strictObject({ ...report, profileId: z.uuid() })])
  .refine((r) => !needsDetail(r.reason) || r.detail !== null, { message: 'Other needs a detail', path: ['detail'] })
export type ReportBody = z.input<typeof reportBody>

/** Since 2026-11-09 the web has no Block. The route stays, and each saved block stays in force (PD17). */
export const blockBody = z.strictObject({ id: clientId, profileId: z.uuid() })

/**
 * "Not interested", a choice of the report modal (PD17). It files no report. The chat and the requests between the two
 * people leave the Messages pages of both, and neither can send a new request. A listing names its lister.
 */
export const notInterestedBody = z.union([z.strictObject({ id: clientId, profileId: z.uuid() }), z.strictObject({ id: clientId, listingId: z.uuid() })])
export type NotInterestedBody = z.infer<typeof notInterestedBody>
