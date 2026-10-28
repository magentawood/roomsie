import * as Sentry from '@sentry/node'
import { privacyOptions } from '@roomsie/config/report'

/** Code reports with `reportError`, so the automatic capture of Fastify is off: its events have no `where` and no person. */
export const startSentry = (options: Sentry.NodeOptions) => Sentry.init({
  ...options,
  ...privacyOptions,
  integrations: (defaults) => defaults.filter((integration) => integration.name !== 'Fastify'),
})

/** Sends the events in memory, before a shutdown. */
export const flushSentry = () => Sentry.flush(2000)
