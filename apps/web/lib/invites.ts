import { inviteRefusalResponse, type InviteRefusal } from '@roomsie/contract'
import { ApiError } from './api'

/** The answer of the gate of T-33, or null for a different error. */
export function refusalOf(err: unknown): InviteRefusal | null {
  const parsed = err instanceof ApiError && err.status === 403 ? inviteRefusalResponse.safeParse(err.body) : null
  return parsed?.success ? parsed.data : null
}
