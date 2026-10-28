import { asc, eq, notInArray, sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { articlePassages, articles } from '../db/schema'
import type { Article } from './parse'

/** Makes the tables match the files, so a merged pull request publishes, changes or removes an article. */
export async function syncArticles(db: Db, published: Article[]) {
  await db.transaction(async (tx) => {
    await tx.delete(articles).where(published.length ? notInArray(articles.slug, published.map((a) => a.slug)) : undefined)
    for (const { passages, ...fields } of published) {
      const [row] = await tx.insert(articles).values(fields).onConflictDoUpdate({ target: articles.slug, set: fields }).returning({ id: articles.id })
      await tx.delete(articlePassages).where(eq(articlePassages.articleId, row!.id))
      if (passages.length) await tx.insert(articlePassages).values(passages.map((p, position) => ({ ...p, articleId: row!.id, position })))
    }
  })
}

/** The passages for the Advisor, best first. Any word of the question matches (T-37). */
export async function searchPassages(db: Db, question: string, limit = 3) {
  // Lexemes go in as they are, with no second stemming. Stop words only give a null query, which matches nothing.
  const query = sql`(select string_agg(quote_literal(word), ' | ')::tsquery from unnest(tsvector_to_array(to_tsvector('english', ${question}))) as word)`
  return db.select({ slug: articles.slug, title: articles.title, heading: articlePassages.heading, text: articlePassages.text })
    .from(articlePassages)
    .innerJoin(articles, eq(articles.id, articlePassages.articleId))
    .where(sql`${articlePassages.search} @@ ${query}`)
    .orderBy(sql`ts_rank_cd(${articlePassages.search}, ${query}) desc`, asc(articles.number), asc(articlePassages.position))
    .limit(limit)
}
