import type { FastifyBaseLogger, FastifyRequest } from 'fastify'
import type { Analytics } from '../src/analytics/track'
import type { Spend } from '../src/models/spend'

/** The model module records each call on the analytics and the spend of the server, as for a request. A script has no request. */
export const scriptRequest = (server: { analytics: Pick<Analytics, 'track'>; spend: Spend }, log: FastifyBaseLogger) =>
  ({ server, log, user: null, analyticsId: null }) as unknown as FastifyRequest
