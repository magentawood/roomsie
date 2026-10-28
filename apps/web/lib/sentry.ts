import * as Sentry from '@sentry/nextjs'
import { privacyOptions } from '@roomsie/config/report'

/** With no DSN, Sentry stays off (T-07). */
export const startSentry = () => Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, ...privacyOptions })
