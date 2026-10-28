import { articleResponse, articlesResponse, type ArticleResponse, type ArticleSummary } from '@roomsie/contract'
import { apiUrl } from './api-url'
import { istDay } from './ist'

// An article changes only with a deploy of the API, so a view takes the cached answer and does not wait (T-37).
const cached = () => ({ signal: AbortSignal.timeout(5000), next: { revalidate: 60 } })

/** By number. It throws when the API fails, so a blog page gives an error, not a 404 that a crawler keeps. */
export async function getArticles(): Promise<ArticleSummary[]> {
  const res = await fetch(`${apiUrl}/v1/articles`, cached())
  if (!res.ok) throw new Error(`GET /v1/articles: ${res.status}`)
  return articlesResponse.parse(await res.json()).articles
}

export async function getArticle(slug: string): Promise<ArticleResponse | null> {
  const res = await fetch(`${apiUrl}/v1/articles/${encodeURIComponent(slug)}`, cached())
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GET /v1/articles/${slug}: ${res.status}`)
  return articleResponse.parse(await res.json())
}

export const checkedOn = (date: string) => `Checked on ${istDay(date, 'long', 'numeric')}`

/** The slug never changes, because links point to it (PD6b). */
export const articlePath = (slug: string) => `/blog/${slug}`
