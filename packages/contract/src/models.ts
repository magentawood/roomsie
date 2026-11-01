import { z } from 'zod'

/** The roles of PD7a that call a model, and the check of the live models (T-11). */
export const modelRoles = ['router', 'extractor', 'observer', 'composer', 'advisor', 'check'] as const
export type ModelRole = (typeof modelRoles)[number]

/** What a vendor bills for one attempt. Cached tokens are the start of the prompt that the vendor saw before. */
export const modelUsage = z.object({ tokensIn: z.int().min(0), cachedTokensIn: z.int().min(0), tokensOut: z.int().min(0) })
export type ModelUsage = z.infer<typeof modelUsage>

/** One answer of each model to a short prompt (T-11). */
export const modelCheckResponse = z.object({ models: z.array(modelUsage.extend({ model: z.string(), answered: z.boolean(), ms: z.int() })) })
