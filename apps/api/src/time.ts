/** Midnight in Mumbai at the start of an ISO date. */
export const startOfIstDay = (day: string) => new Date(`${day}T00:00:00+05:30`)
export const hoursBefore = (now: Date, hours: number) => new Date(now.getTime() - hours * 3_600_000)
/** The start of the last 7 days: the "this week" of the admin numbers (T-62). */
export const weekBefore = (now: Date) => hoursBefore(now, 7 * 24)

/** The date of a time in Mumbai, as an ISO date. */
export const istDateOf = (time: Date) => time.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
/** The date of today in Mumbai, as an ISO date. */
export const todayInIst = () => istDateOf(new Date())
export const daysBefore = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10)
