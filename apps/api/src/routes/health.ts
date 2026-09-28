import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { HealthResponse } from '@roomsie/contract'

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        operationId: 'getHealth',
        response: { 200: HealthResponse },
      },
    },
    async () => ({
      status: 'ok' as const,
      service: 'api' as const,
      time: new Date().toISOString(),
    }),
  )
}
