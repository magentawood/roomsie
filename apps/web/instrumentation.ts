import type { Instrumentation } from 'next'
import { reportError } from '@roomsie/config/report'
import { startSentry } from './lib/sentry'

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') startSentry()
}

export const onRequestError: Instrumentation.onRequestError = (err, request, context) =>
  reportError(err, { where: `${request.method} ${context.routePath}` })
