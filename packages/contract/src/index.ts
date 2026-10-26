import { z } from 'zod'

export const healthResponse = z.object({ status: z.literal('ok') })
export type HealthResponse = z.infer<typeof healthResponse>

export const meResponse = z.object({ id: z.uuid(), status: z.enum(['active', 'suspended', 'deleted']) })
export type MeResponse = z.infer<typeof meResponse>
/** The area groups of PD2. F-06 sets the launch flag of three. */
export const areasResponse = z.object({
  areas: z.array(z.object({ slug: z.string(), name: z.string(), isLaunchArea: z.boolean() })),
})
export type AreasResponse = z.infer<typeof areasResponse>

export * from './listings'

/** `DELETE /v1/me` answers 204 with no body. `type: 'null'` tells the OpenAPI
 *  document to give the 204 no content, not a JSON `null`. */
export const deleteMeResponse = z.null().meta({ type: 'null', description: 'Deleted. No body.' })
