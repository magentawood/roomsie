import { z } from 'zod'
import { areaSlug } from './shared'

export const healthResponse = z.object({ status: z.literal('ok') })
export type HealthResponse = z.infer<typeof healthResponse>

/** `reviewer`: the person may open the ID checks (T-46). */
export const meResponse = z.object({ id: z.uuid(), status: z.enum(['active', 'suspended', 'deleted']), moderator: z.boolean(), reviewer: z.boolean() })
export type MeResponse = z.infer<typeof meResponse>
/** The area groups of PD2, their sub-areas and pockets, in order. `parent` is null for a group. */
export const areasResponse = z.object({
  areas: z.array(z.object({ slug: areaSlug, name: z.string(), parent: areaSlug.nullable(), aliases: z.array(z.string()) })),
})
export type AreasResponse = z.infer<typeof areasResponse>

export * from './alerts'
export * from './events'
export * from './feedback'
export * from './listings'
export * from './messages'
export * from './moderation'
export * from './profiles'
export * from './reports'
export * from './requests'
export * from './saved'
export * from './shared'
export * from './site'
export * from './verification'

/** A 204 with no body. `type: 'null'` tells the OpenAPI document to give the 204 no content, not a JSON `null`. */
export const noContent = z.null().meta({ type: 'null', description: 'No body.' })
