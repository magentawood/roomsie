import * as Sentry from '@sentry/node'
import { privacyOptions } from '@roomsie/config/report'

/**
 * The start file of Sentry in the API. Errors only, with no tracing (ADR-0014).
 * Code reports with `reportError`, so the automatic capture of Fastify is off: it has no `where` and no person.
 */
export const startSentry = (options: Sentry.NodeOptions) => Sentry.init({
  ...options,
  ...privacyOptions,
  integrations: (defaults) => defaults.filter((integration) => integration.name !== 'Fastify'),
})

/** Sends the events in memory, before a shutdown. */
export const flushSentry = () => Sentry.flush(2000)
