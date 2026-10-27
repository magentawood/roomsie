import { z } from 'zod'
import { reportReasons } from '@roomsie/contract'

const commaList = <T extends z.ZodType>(item: T) =>
  z.preprocess((v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v), z.array(item))

/** The rules of PD18 as settings, with the PD18 values as defaults, the Firebase uids of the moderators (T-19), and of the ID reviewers (T-46). */
export const moderationSettings = z.object({
  MODERATOR_UIDS: commaList(z.string()).default([]),
  REVIEWER_UIDS: commaList(z.string()).default([]),
  REPORT_HIDE_AT_REPORTERS: z.coerce.number().int().min(1).default(2),
  REPORT_SAFETY_REASONS: commaList(z.enum(reportReasons)).default(['harassment', 'under_18']),
}).transform((s) => ({ moderatorUids: s.MODERATOR_UIDS, reviewerUids: s.REVIEWER_UIDS, hideAtReporters: s.REPORT_HIDE_AT_REPORTERS, safetyReasons: s.REPORT_SAFETY_REASONS }))
export type Moderation = z.output<typeof moderationSettings>
