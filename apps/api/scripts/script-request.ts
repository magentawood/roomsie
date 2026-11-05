import type { FastifyBaseLogger, FastifyRequest } from 'fastify'
import type { Analytics } from '../src/analytics/track'
import type { Spend } from '../src/models/spend'
import type { Traces } from '../src/traces/store'

/** The model module records each call on the analytics and the spend of the server, and reads the Gemini switch, as for a request. A script has no request. */
export const scriptRequest = (server: { analytics: Pick<Analytics, 'track'>; spend: Pick<Spend, 'record'>; geminiOnly: () => Promise<boolean> }, log: FastifyBaseLogger) =>
  ({ server: { ...server, traces: noTraces }, log, user: null, analyticsId: null }) as unknown as FastifyRequest

/** A script saves no trace (the spec of T-64). */
export const noTraces: Pick<Traces, 'save'> = { save: () => {} }
