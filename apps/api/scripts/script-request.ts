import type { FastifyBaseLogger, FastifyRequest } from 'fastify'

/** The model module records each call on the analytics and the spend of the server, as for a request. A script has no request. */
export const scriptRequest = (server: Pick<FastifyRequest['server'], 'analytics' | 'spend'>, log: FastifyBaseLogger) =>
  ({ server, log, user: null, analyticsId: null }) as unknown as FastifyRequest
