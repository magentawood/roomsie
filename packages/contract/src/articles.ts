import { z } from 'zod'

/** An article of the blog (T-37). Its slug never changes, because links point to it. */
export const articleSummary = z.object({
  slug: z.string(),
  number: z.int(),
  title: z.string(),
  author: z.string(),
  authorLine: z.string(),
  /** A file in the public folder of the web. With none, the byline shows the initials. */
  authorPhoto: z.string().nullable(),
  seoTitle: z.string(),
  seoDescription: z.string(),
  dateChecked: z.iso.date(),
})
export type ArticleSummary = z.infer<typeof articleSummary>
/** By number. */
export const articlesResponse = z.object({ articles: z.array(articleSummary) })
/** The sections in order. Text before the first heading is a section with no heading. */
export const articleResponse = articleSummary.extend({ passages: z.array(z.object({ heading: z.string().nullable(), html: z.string() })) })
export type ArticleResponse = z.infer<typeof articleResponse>
