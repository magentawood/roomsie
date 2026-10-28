import { notFound } from 'next/navigation'
import { shareCard, shareCardSize } from '../../../components/blog/share-card'
import { getArticle } from '../../../lib/articles'

export const size = shareCardSize
export const contentType = 'image/png'
export const alt = 'The title of a Roomsie article with the Roomsie logo'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const article = await getArticle((await params).slug)
  if (!article) notFound()
  return shareCard(article.title, article.coverImage)
}
