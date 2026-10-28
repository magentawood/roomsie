import { z } from 'zod'

/** The 403 of a person that the gate refuses (T-33). `account`: the person has an account, which can still delete itself. */
export const inviteOnlyResponse = z.object({ error: z.literal('invite only'), opensAt: z.iso.datetime({ offset: true }).nullable(), account: z.boolean() })
export type InviteOnly = z.infer<typeof inviteOnlyResponse>

/** The gate: closed while `inviteOnly` is on and `opensAt` is empty or in the future. */
export const inviteGateBody = z.strictObject({ inviteOnly: z.boolean(), opensAt: z.iso.datetime({ offset: true }).nullable() })
export const inviteBody = z.strictObject({ email: z.email().max(254) })
/** The gate and the invited emails, newest first. */
export const adminInvitesResponse = inviteGateBody.extend({ invites: z.array(z.object({ email: z.string(), createdAt: z.iso.datetime() })) })
export type AdminInvites = z.infer<typeof adminInvitesResponse>
