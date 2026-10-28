import type { MetadataRoute } from 'next'
import { connection } from 'next/server'
import { articlePath, getArticles } from '../lib/articles'
import { siteUrl } from '../lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // At build time the API can be down, or older than this web. Thus the sitemap renders on each request.
  await connection()
  const articles = await getArticles()
  return [
    { url: siteUrl },
    ...(articles.length ? [{ url: `${siteUrl}/blog` }] : []),
    ...articles.map((a) => ({ url: `${siteUrl}${articlePath(a.slug)}`, lastModified: a.dateChecked })),
  ]
}
