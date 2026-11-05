import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { errorResponse, productNumbersQuery, productNumbersResponse } from '@roomsie/contract'
import type { AnalyticsDb } from '../analytics/client'
import { requireModerator, type AuthOptions } from '../auth'
import { productNumbers } from './numbers'

/** The product numbers of the admin (T-66). Moderators only. */
export function numberRoutes(v1: FastifyInstance, options: AuthOptions & { analyticsDb?: AnalyticsDb }) {
  const app = v1.withTypeProvider<ZodTypeProvider>()
  app.get('/admin/numbers', { preHandler: requireModerator(options), schema: { querystring: productNumbersQuery, response: { 200: productNumbersResponse, 404: errorResponse } } },
    (req) => productNumbers(options.analyticsDb, req.query.period, new Date(), req.log))
}
