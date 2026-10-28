import { z } from 'zod'

/** The address of an article. It never changes, because links point to it (PD6b). */
export const articleSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100)

/** An article of the blog (T-37). */
export const articleSummary = z.object({
  slug: articleSlug,
  number: z.int(),
  title: z.string(),
  author: z.string(),
  authorLine: z.string(),
  /** A file in the public folder of the web. */
  authorPhoto: z.string().nullable(),
  seoTitle: z.string(),
  seoDescription: z.string(),
  dateChecked: z.iso.date(),
  /** A file in the public folder of the web, with its alt text, or both null. */
  coverImage: z.string().nullable(),
  coverAlt: z.string().nullable(),
})
export type ArticleSummary = z.infer<typeof articleSummary>
/** By number. */
export const articlesResponse = z.object({ articles: z.array(articleSummary) })
/** The sections in order. Text before the first heading is a section with no heading. */
export const articleResponse = articleSummary.extend({ passages: z.array(z.object({ heading: z.string().nullable(), html: z.string() })) })
export type ArticleResponse = z.infer<typeof articleResponse>
