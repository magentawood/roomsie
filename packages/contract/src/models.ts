import { z } from 'zod'
import { scopeBands } from './goals'
import { knownRows } from './shared'

/** The roles of PD7a that call a model, and the check of the live models (T-11). */
export const modelRoles = ['router', 'extractor', 'observer', 'composer', 'advisor', 'check'] as const
export type ModelRole = (typeof modelRoles)[number]
export const isModelRole = (role: string | null): role is ModelRole => modelRoles.some((r) => r === role)

/** What a vendor bills for one attempt. Cached tokens are the start of the prompt that the vendor saw before. The event `model_called` has these fields, so a change of them gives it a new version. */
export const modelUsage = z.object({ tokensIn: z.int().min(0), cachedTokensIn: z.int().min(0), tokensOut: z.int().min(0) })
export type ModelUsage = z.infer<typeof modelUsage>

/** One answer of each model to a short prompt (T-11). */
export const modelCheckResponse = z.object({ models: z.array(modelUsage.extend({ model: z.string(), answered: z.boolean(), ms: z.int().min(0) })) })

export const callShare = z.number().min(0).max(1)
/** The calls of one role or of all, each attempt a call: a failed call has no valid answer, and a fallback call went to the fallback model. */
const callStats = z.object({ calls: z.int().min(0), failedShare: callShare, fallbackShare: callShare, p95Ms: z.int().min(0).nullable(), rupees: z.number().min(0) })
const roleStats = callStats.extend({ role: z.enum(modelRoles) })
/** The switch of the admin (T-65): Gemini answers each call alone while it is on. */
export const modelSwitchState = z.object({ geminiOnly: z.boolean(), since: z.iso.datetime().nullable(), by: z.string().nullable() })
/** The AI pipeline of the admin (T-65). `numbers` is null with no analytics database, or when its read fails or takes over 5 s. Today is in IST. */
export const aiOverviewResponse = z.object({
  switch: modelSwitchState,
  spend: z.object({ today: z.number().min(0), dailyAmount: z.number().positive() }),
  numbers: z.object({
    today: callStats.omit({ rupees: true }),
    lastQuarterHour: callStats.pick({ calls: true, failedShare: true, fallbackShare: true }),
    roles: z.array(roleStats),
    bands: z.record(z.enum(scopeBands), z.int().min(0)),
  }).nullable(),
  settings: z.object({
    models: z.object({ primary: z.string(), fallback: z.string(), timeoutMs: z.int().positive() }).nullable(),
    spendAlertPercents: z.array(z.int()),
    routerMinProbability: z.number(),
    limits: z.object({ turnCap: z.int(), turnBackstop: z.int(), sessionsPerDevice: z.int(), sessionsPerIp: z.int(), sessionsPerIpRange: z.int(), typedTurnsPerMinute: z.int() }),
  }),
})
export type AiOverviewResponse = z.infer<typeof aiOverviewResponse>
export const modelSwitchBody = z.strictObject({ geminiOnly: z.boolean() })
export type ModelSwitchBody = z.infer<typeof modelSwitchBody>
export const modelSwitchLogResponse = z.object({ flips: z.array(z.object({ geminiOnly: z.boolean(), at: z.iso.datetime(), by: z.string().nullable() })) })
/** What the web reads: it drops a role or a band that its bundle does not know, so an older tab keeps working. */
const numbers = aiOverviewResponse.shape.numbers.unwrap()
export const aiOverviewView = aiOverviewResponse.extend({
  numbers: numbers.extend({
    roles: knownRows(numbers.shape.roles.element, 'role', modelRoles),
    bands: z.record(z.string(), z.int().min(0)).transform((bands) => Object.fromEntries(scopeBands.map((band) => [band, bands[band] ?? 0]))).pipe(numbers.shape.bands),
  }).nullable(),
})
