import * as Sentry from '@sentry/nextjs'
import type { Instrumentation } from 'next'
import { privacyOptions, reportError } from '@roomsie/config/report'

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, ...privacyOptions })
}

/** An error of a server render, with its route as the place (T-07). */
export const onRequestError: Instrumentation.onRequestError = (err, request, context) =>
  reportError(err, { where: `${request.method} ${context.routePath}` })
