import { z } from 'zod'

/** The switches of the alerts (PD17). Push alerts belong to each browser, so the account keeps only the email switch. */
export const alertSettings = z.object({ emailAlerts: z.boolean() })

/** The push token that Firebase Cloud Messaging gives to one browser (T-55). */
export const pushTokenBody = z.strictObject({ token: z.string().min(1).max(4096) })
/** If the API has the token of this browser for the caller: the "Push alerts" switch of the browser. */
export const pushTokenStatus = z.object({ registered: z.boolean() })
