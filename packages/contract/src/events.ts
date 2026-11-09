import { z } from 'zod'
import { formASlots } from './form-a'
import { closeAnswer, rateLimits, scopeBands } from './goals'
import { modelOutcomes, modelRoles, modelUsage } from './models'
import { reportReasons } from './reports'

/** A change of the fields of an event gives it a new version. No event has text (T-24, ADR-0012). */
const version1 = z.literal(1).default(1)
const target = z.enum(['person', 'listing'])

/** The analytics events. `track()` of the API writes them, and no product code reads them. */
export const analyticsEvent = z.discriminatedUnion('name', [
  z.strictObject({ name: z.literal('interview_started'), eventVersion: version1 }),
  z.strictObject({ name: z.literal('results_shown'), eventVersion: version1, count: z.number().int().min(0) }),
  z.strictObject({ name: z.literal('wall_hit'), eventVersion: version1 }),
  z.strictObject({ name: z.literal('signed_in'), eventVersion: version1, newAccount: z.boolean() }),
  z.strictObject({ name: z.literal('connect_sent'), eventVersion: version1, to: target }),
  z.strictObject({ name: z.literal('connect_accepted'), eventVersion: version1, to: target }),
  /** One attempt of one model call: its tokens and time give the cost of an interview (PD5, T-11). */
  z.strictObject({
    name: z.literal('model_called'), eventVersion: version1, role: z.enum(modelRoles), model: z.string().max(100),
    ...modelUsage.shape, ms: z.int().min(0), fallback: z.boolean(), outcome: z.enum(modelOutcomes), session: z.uuid().nullable(),
  }),
  /** A typed value that contradicts an earlier value. The assistant asks which to keep (PD3b). Many on one slot show a bad question. */
  z.strictObject({ name: z.literal('slot_conflict'), eventVersion: version1, slot: z.enum(formASlots) }),
  /** The band that a typed turn used (T-34). The label with the text stays on the chat turn. */
  z.strictObject({ name: z.literal('turn_routed'), eventVersion: version1, band: z.enum(scopeBands) }),
  z.strictObject({ name: z.literal('report_filed'), eventVersion: version1, subject: target, reason: z.enum(reportReasons) }),
  /** A rate limit that stopped a person: the metric of PD9 that shows if a limit stops human users (T-21). */
  z.strictObject({ name: z.literal('limit_hit'), eventVersion: version1, limit: z.enum(rateLimits) }),
  /** A goal that its owner closed, with the answer of "Where did you find it?" (T-50). */
  z.strictObject({ name: z.literal('goal_closed'), eventVersion: version1, where: closeAnswer }),
  z.strictObject({ name: z.literal('goal_reopened'), eventVersion: version1 }),
  /** "Same move?": the question to a new goal that looks like an open goal, and the answer of the person. */
  z.strictObject({ name: z.literal('same_move'), eventVersion: version1, step: z.enum(['asked', 'same', 'separate']) }),
])
export type AnalyticsEvent = z.input<typeof analyticsEvent>
