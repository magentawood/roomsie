import Link from 'next/link'
import type { ArticleSummary } from '@roomsie/contract'
import { articlePath, checkedOn } from '../../lib/articles'
import { Portrait } from './portrait'

export function ArticleRow({ article }: { article: ArticleSummary }) {
  return (
    <li className="relative flex flex-col gap-4 border-t border-secondary py-6 md:flex-row md:gap-6 md:py-8">
      {article.coverImage && <img src={article.coverImage} alt="" className="aspect-video w-full rounded-lg object-cover md:order-last md:h-33.5 md:w-50 md:shrink-0" />}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h2 className="text-xl font-semibold text-primary">
          {/* The full prefetch loads the article before the click, so it opens at once. */}
          <Link href={articlePath(article.slug)} prefetch className="rounded-sm outline-focus-ring after:absolute after:inset-0 focus-visible:outline-2">{article.title}</Link>
        </h2>
        <p className="text-md text-tertiary">{article.seoDescription}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tertiary">
          <Portrait article={article} size="sm" />
          <span className="font-semibold text-primary">{article.author}</span>
          <span aria-hidden>·</span>
          <span>{checkedOn(article.dateChecked)}</span>
        </p>
      </div>
    </li>
  )
}
