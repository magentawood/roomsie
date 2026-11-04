export const hoursBefore = (now: Date, hours: number) => new Date(now.getTime() - hours * 3_600_000)
/** The start of the last 7 days: the "this week" of the admin numbers (T-62). */
export const weekBefore = (now: Date) => hoursBefore(now, 7 * 24)

/** The date of today in Mumbai, as an ISO date. */
export const todayInIst = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
