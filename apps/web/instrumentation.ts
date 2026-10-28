import * as Sentry from '@sentry/nextjs'
import { privacyOptions } from '@roomsie/config/report'

/** Sentry on the server of the web, for the errors of a server render (T-07). With no DSN, it stays off. */
export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, ...privacyOptions })
}

export const onRequestError = Sentry.captureRequestError
