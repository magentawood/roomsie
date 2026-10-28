import type { ArticleSummary } from '@roomsie/contract'
import { initials } from '../../lib/person'

/** The photo of the author, or the initials when the file names no photo. */
export function Portrait({ article, size }: { article: ArticleSummary; size: 'sm' | 'md' }) {
  const box = size === 'md' ? 'size-10' : 'size-8'
  if (article.authorPhoto) return <img src={article.authorPhoto} alt="" className={`${box} shrink-0 rounded-full object-cover`} />
  return (
    <span aria-hidden className={`flex ${box} shrink-0 items-center justify-center rounded-full bg-tertiary text-sm font-semibold text-tertiary`}>
      {initials(article.author)}
    </span>
  )
}
