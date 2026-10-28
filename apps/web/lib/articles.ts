import { articleResponse, articlesResponse, type ArticleResponse, type ArticleSummary } from '@roomsie/contract'
import { apiUrl, cachedRead } from './api-url'
import { istDay } from './ist'

// An article changes only with a deploy of the API, so a view takes the cached answer and does not wait (T-37).

/** By number. It throws when the API fails, so a blog page gives an error, not a 404 that a crawler keeps. */
export async function getArticles(): Promise<ArticleSummary[]> {
  const res = await fetch(`${apiUrl}/v1/articles`, cachedRead())
  if (!res.ok) throw new Error(`GET /v1/articles: ${res.status}`)
  return articlesResponse.parse(await res.json()).articles
}

export async function getArticle(slug: string): Promise<ArticleResponse | null> {
  const res = await fetch(`${apiUrl}/v1/articles/${encodeURIComponent(slug)}`, cachedRead())
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GET /v1/articles/${slug}: ${res.status}`)
  return articleResponse.parse(await res.json())
}

export const checkedOn = (date: string) => `Checked on ${istDay(date, 'long', true)}`

export const articlePath = (slug: string) => `/blog/${slug}`
