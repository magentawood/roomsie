import type { MetadataRoute } from 'next'
import { connection } from 'next/server'
import { getArticles } from '../lib/articles'
import { siteUrl } from '../lib/site'

/** The landing page, and the blog when it has an article (T-37). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // At build time the API can be down, or older than this web. Thus the sitemap renders on each request.
  await connection()
  const articles = await getArticles()
  if (articles.length === 0) return [{ url: siteUrl }]
  return [
    { url: siteUrl },
    { url: `${siteUrl}/blog` },
    ...articles.map((a) => ({ url: `${siteUrl}/blog/${a.slug}`, lastModified: a.dateChecked })),
  ]
}
