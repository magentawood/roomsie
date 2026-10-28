import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { articleResponse, articlesResponse, errorResponse } from '@roomsie/contract'
import type { Db } from '../db/client'
import { articlePassages, articles } from '../db/schema'

/** The blog gets the articles here, server to server (ADR-0007). */
export function articleRoutes(v1: FastifyInstance, { db }: { db: Db }) {
  const app = v1.withTypeProvider<ZodTypeProvider>()

  app.get('/articles', { schema: { response: { 200: articlesResponse } } }, async () => ({
    articles: await db.select().from(articles).orderBy(asc(articles.number)),
  }))

  app.get('/articles/:slug', { schema: { params: z.object({ slug: z.string().max(100) }), response: { 200: articleResponse, 404: errorResponse } } }, async (req, reply) => {
    const [found] = await db.select().from(articles).where(eq(articles.slug, req.params.slug))
    if (!found) return reply.code(404).send({ error: 'not found' })
    const passages = await db.select({ heading: articlePassages.heading, html: articlePassages.html })
      .from(articlePassages).where(eq(articlePassages.articleId, found.id)).orderBy(asc(articlePassages.position))
    return { ...found, passages }
  })
}
