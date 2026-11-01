import { z } from 'zod'

/** The roles of PD7a that call a model, and the check of the live models (T-11). */
export const modelRoles = ['router', 'extractor', 'observer', 'composer', 'advisor', 'check'] as const
export type ModelRole = (typeof modelRoles)[number]

/** One answer of each model to a short prompt (T-11). */
export const modelCheckResponse = z.object({
  models: z.array(z.object({ model: z.string(), answered: z.boolean(), ms: z.int(), tokensIn: z.int(), tokensOut: z.int() })),
})
