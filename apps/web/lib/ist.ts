/** Each time that a person sees is in IST. */
export const india = { timeZone: 'Asia/Kolkata' } as const

/** "8 November" or "28 Oct". */
export const istDay = (iso: string, month: 'long' | 'short' = 'long') => new Date(iso).toLocaleDateString('en-IN', { ...india, day: 'numeric', month })

// IST is UTC+5:30 all year, with no daylight saving.
const istOffsetMs = 19_800_000

/** The value of a datetime-local input in IST, for example "2026-11-08T00:00". */
export const toIstInput = (iso: string | null) => (iso ? new Date(Date.parse(iso) + istOffsetMs).toISOString().slice(0, 16) : '')

/** A datetime-local value read as IST. An empty value is no time. */
export const fromIstInput = (value: string) => (value ? `${value}:00+05:30` : null)
