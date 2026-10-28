import { articleResponse, articlesResponse, type ArticleResponse, type ArticleSummary } from '@roomsie/contract'
import { apiUrl, cachedFetchOptions } from './api-url'
import { istDay } from './ist'

/** By number. It throws when the API fails, so a blog page gives an error, not a 404 that a crawler keeps. */
export async function getArticles(): Promise<ArticleSummary[]> {
  const res = await fetch(`${apiUrl}/v1/articles`, cachedFetchOptions())
  if (!res.ok) throw new Error(`GET /v1/articles: ${res.status}`)
  return articlesResponse.parse(await res.json()).articles
}

export async function getArticle(slug: string): Promise<ArticleResponse | null> {
  const res = await fetch(`${apiUrl}/v1/articles/${encodeURIComponent(slug)}`, cachedFetchOptions())
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GET /v1/articles/${slug}: ${res.status}`)
  return articleResponse.parse(await res.json())
}

export const checkedOn = (date: string) => `Checked on ${istDay(date, 'long', 'numeric')}`

export const articlePath = (slug: string) => `/blog/${slug}`
