import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { desc, eq } from 'drizzle-orm'
import { adminQuotesResponse, errorResponse, landingQuoteCount, noContent, quoteBody, siteDetails as siteDetailsBody, siteResponse, type SiteDetails } from '@roomsie/contract'
import { requireModerator, type AuthOptions } from '../auth'
import type { Db } from '../db/client'
import { quotes, siteDetails } from '../db/schema'
import { idParams } from '../params'

const noDetails: SiteDetails = { instagram: null, whatsapp: null, facebook: null, linkedin: null, contactEmail: null, orgNumber: null }

/** The landing page shows a full collage or no quotes (T-23a). */
async function landingQuotes(db: Db) {
  const newest = await db.select({ id: quotes.id, text: quotes.text, name: quotes.name })
    .from(quotes).orderBy(desc(quotes.createdAt)).limit(landingQuoteCount)
  return newest.length === landingQuoteCount ? newest : []
}

async function details(db: Db): Promise<SiteDetails> {
  const [row] = await db.select({
    instagram: siteDetails.instagram, whatsapp: siteDetails.whatsapp, facebook: siteDetails.facebook, linkedin: siteDetails.linkedin,
    contactEmail: siteDetails.contactEmail, orgNumber: siteDetails.orgNumber,
  }).from(siteDetails)
  return row ?? noDetails
}

/** The quotes and the details of the landing page, which moderators edit (T-23a). */
export function siteRoutes(v1: FastifyInstance, options: AuthOptions) {
  const { db } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireModerator(options)

  app.get('/site', { schema: { response: { 200: siteResponse } } }, async () => {
    const [shown, set] = await Promise.all([landingQuotes(db), details(db)])
    return { quotes: shown, details: set }
  })

  app.get('/admin/quotes', { preHandler, schema: { response: { 200: adminQuotesResponse, 404: errorResponse } } }, async () => {
    const rows = await db.select().from(quotes).orderBy(desc(quotes.createdAt))
    return { quotes: rows.map((q) => ({ id: q.id, text: q.text, name: q.name, createdAt: q.createdAt.toISOString() })) }
  })

  app.post('/admin/quotes', { preHandler, schema: { body: quoteBody, response: { 204: noContent, 404: errorResponse } } }, async (req, reply) => {
    await db.insert(quotes).values({ text: req.body.text, name: req.body.name, addedBy: req.user!.id })
    return reply.code(204).send(null)
  })

  app.delete('/admin/quotes/:id', { preHandler, schema: { params: idParams, response: { 204: noContent, 404: errorResponse } } }, async (req, reply) => {
    await db.delete(quotes).where(eq(quotes.id, req.params.id))
    return reply.code(204).send(null)
  })

  app.put('/admin/site', { preHandler, schema: { body: siteDetailsBody, response: { 204: noContent, 404: errorResponse } } }, async (req, reply) => {
    const row = { ...req.body, updatedBy: req.user!.id, updatedAt: new Date() }
    await db.insert(siteDetails).values(row).onConflictDoUpdate({ target: siteDetails.id, set: row })
    return reply.code(204).send(null)
  })
}
