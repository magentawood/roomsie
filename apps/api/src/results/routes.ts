import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { resultsBody, resultsPageSize, resultsResponse } from '@roomsie/contract'
import { optionalUser, type AuthOptions } from '../auth'
import type { Storage } from '../storage'
import { searchResults } from './search'
import type { Matching } from './settings'

/** The results grid has no login gate (PD6b). */
export function resultRoutes(v1: FastifyInstance, options: AuthOptions & { storage: Storage; matching: Matching }) {
  const app = v1.withTypeProvider<ZodTypeProvider>()

  app.post('/results', { preHandler: optionalUser(options), schema: { body: resultsBody, response: { 200: resultsResponse } } }, async (req) => {
    const { form, page } = req.body
    const found = await searchResults(options, form, req.user?.id, page, resultsPageSize)
    v1.analytics.track(req, { name: 'results_shown', count: found.results.length })
    return { ...found, page }
  })
}
