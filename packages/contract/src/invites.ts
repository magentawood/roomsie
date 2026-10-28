import { z } from 'zod'

/** The 403 of a person that the gate refuses (T-33). `account`: the person has an account, which can still delete itself. */
export const inviteRefusalResponse = z.object({ error: z.literal('invite only'), opensAt: z.iso.datetime({ offset: true }).nullable(), account: z.boolean() })
export type InviteRefusal = z.infer<typeof inviteRefusalResponse>

export const inviteGateBody = z.strictObject({ inviteOnly: z.boolean(), opensAt: z.iso.datetime({ offset: true }).nullable() })
export type InviteGateBody = z.infer<typeof inviteGateBody>
/** The invites keep each email in lower case. */
export const inviteBody = z.strictObject({ email: z.email().max(254).toLowerCase() })
export type InviteBody = z.input<typeof inviteBody>
/** The gate and the invited emails, newest first. */
export const adminInvitesResponse = inviteGateBody.extend({ invites: z.array(z.object({ id: z.uuid(), email: z.string(), createdAt: z.iso.datetime() })) })
export type AdminInvites = z.infer<typeof adminInvitesResponse>
