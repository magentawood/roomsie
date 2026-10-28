/** Each time that a person sees is in IST. */
export const india = { timeZone: 'Asia/Kolkata' } as const

/** "8 November", "28 Oct", or with the year "8 October 2026". */
export const istDay = (iso: string, month: 'long' | 'short' = 'long', year?: 'numeric') =>
  new Date(iso).toLocaleDateString('en-IN', { ...india, day: 'numeric', month, year })

/** The value of a datetime-local input in IST, for example "2026-11-08T00:00". Swedish dates read as ISO. */
export const toIstInput = (iso: string | null) => (iso ? new Date(iso).toLocaleString('sv-SE', india).replace(' ', 'T').slice(0, 16) : '')

/** A datetime-local value read as IST. An empty value is no time. IST is UTC+5:30 all year, with no daylight saving. */
export const fromIstInput = (value: string) => (value ? `${value}:00+05:30` : null)
