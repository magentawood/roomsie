import { inviteOnlyResponse, type InviteOnly } from '@roomsie/contract'
import { ApiError } from './api'

/** The answer of the gate (T-33), or null for a different error. */
export function refusalOf(err: unknown): InviteOnly | null {
  const parsed = err instanceof ApiError && err.status === 403 ? inviteOnlyResponse.safeParse(err.body) : null
  return parsed?.success ? parsed.data : null
}

const india = { timeZone: 'Asia/Kolkata' } as const
/** "8 November" or "28 Oct", in IST. */
export const istDay = (iso: string, month: 'long' | 'short' = 'long') => new Date(iso).toLocaleDateString('en-IN', { ...india, day: 'numeric', month })

/** The value of a datetime-local input in IST, for example "2026-11-08T00:00". */
export function toIstInput(iso: string | null) {
  if (!iso) return ''
  const parts = new Intl.DateTimeFormat('en-CA', { ...india, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))
  const part = (type: string) => parts.find((p) => p.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}

/** A datetime-local value read as IST. An empty value is no opening time. */
export const fromIstInput = (value: string) => (value ? `${value}:00+05:30` : null)
