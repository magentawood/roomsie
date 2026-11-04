/** The start of the last 7 days: the week of the admin numbers (T-62). */
export const weekBefore = (now: Date) => new Date(now.getTime() - 7 * 86_400_000)

/** The date of today in Mumbai, as an ISO date. */
export const todayInIst = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
