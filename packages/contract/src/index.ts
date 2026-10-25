import { z } from 'zod'

export const healthResponse = z.object({ status: z.literal('ok') })
export type HealthResponse = z.infer<typeof healthResponse>

export const meResponse = z.object({ id: z.uuid(), status: z.enum(['active', 'suspended', 'deleted']) })
export type MeResponse = z.infer<typeof meResponse>

/** `DELETE /v1/me` answers 204 with no body. A sign-in after it makes a new account. */
export const deleteMeResponse = z.null()
