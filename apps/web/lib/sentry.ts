import * as Sentry from '@sentry/nextjs'
import { privacyOptions } from '@roomsie/config/report'

/** Starts Sentry in the browser and on the server of the web. With no DSN, it stays off (T-07). */
export const startSentry = () => Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, ...privacyOptions })
