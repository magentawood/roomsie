import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { articleResponse, articlesResponse, errorResponse } from '@roomsie/contract'
import type { Db } from '../db/client'
import { articlePassages, articles } from '../db/schema'

const summary = {
  slug: articles.slug, number: articles.number, title: articles.title, author: articles.author, authorLine: articles.authorLine,
  authorPhoto: articles.authorPhoto, seoTitle: articles.seoTitle, seoDescription: articles.seoDescription, dateChecked: articles.dateChecked,
}

/** The blog gets the articles here, server to server (ADR-0007). */
export function articleRoutes(v1: FastifyInstance, { db }: { db: Db }) {
  const app = v1.withTypeProvider<ZodTypeProvider>()

  app.get('/articles', { schema: { response: { 200: articlesResponse } } }, async () => ({
    articles: await db.select(summary).from(articles).orderBy(asc(articles.number)),
  }))

  app.get('/articles/:slug', { schema: { params: z.object({ slug: z.string().max(100) }), response: { 200: articleResponse, 404: errorResponse } } }, async (req, reply) => {
    const [found] = await db.select({ id: articles.id, ...summary }).from(articles).where(eq(articles.slug, req.params.slug))
    if (!found) return reply.code(404).send({ error: 'not found' })
    const { id, ...fields } = found
    const passages = await db.select({ heading: articlePassages.heading, html: articlePassages.html })
      .from(articlePassages).where(eq(articlePassages.articleId, id)).orderBy(asc(articlePassages.position))
    return { ...fields, passages }
  })
}
