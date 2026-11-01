import { z } from 'zod'
import { modelRoles, modelUsage } from './models'
import { reportReasons } from './reports'

/** A change of the fields of an event gives it a new version. No event has text (T-24, ADR-0012). */
const version1 = z.literal(1).default(1)
const target = z.enum(['person', 'listing'])
const nonNegativeInt = z.int().min(0)

/** The analytics events. `track()` of the API writes them, and no product code reads them. */
export const analyticsEvent = z.discriminatedUnion('name', [
  z.strictObject({ name: z.literal('interview_started'), eventVersion: version1 }),
  z.strictObject({ name: z.literal('results_shown'), eventVersion: version1, count: nonNegativeInt }),
  z.strictObject({ name: z.literal('wall_hit'), eventVersion: version1 }),
  z.strictObject({ name: z.literal('signed_in'), eventVersion: version1, newAccount: z.boolean() }),
  z.strictObject({ name: z.literal('connect_sent'), eventVersion: version1, to: target }),
  z.strictObject({ name: z.literal('connect_accepted'), eventVersion: version1, to: target }),
  /** One attempt of one model call: its tokens and time give the cost of an interview (PD5, T-11). */
  z.strictObject({
    name: z.literal('model_called'), eventVersion: version1, role: z.enum(modelRoles), model: z.string().max(100),
    ...modelUsage.shape, ms: nonNegativeInt, fallback: z.boolean(), outcome: z.enum(['ok', 'invalid', 'failed']), session: z.uuid().nullable(),
  }),
  z.strictObject({ name: z.literal('report_filed'), eventVersion: version1, subject: target, reason: z.enum(reportReasons) }),
])
export type AnalyticsEvent = z.input<typeof analyticsEvent>
