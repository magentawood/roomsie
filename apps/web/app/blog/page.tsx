import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArticleRow } from '../../components/blog/article-row'
import { Footer } from '../../components/landing/contact'
import { LandingHeader } from '../../components/landing/hero'
import { Container } from '../../components/landing/parts'
import { getArticles } from '../../lib/articles'
import { getSite } from '../../lib/site'

const description = 'Leave and licence, deposits, brokers and flatmates. Written by the Roomsie team, with the date we last checked each fact.'

export const metadata: Metadata = {
  title: 'The rent questions, answered · Roomsie blog',
  description,
  alternates: { canonical: '/blog' },
}

/** The list of the articles (T-37). Until the first article, the blog is a 404. */
export default async function Blog() {
  const [articles, { details }] = await Promise.all([getArticles(), getSite()])
  if (articles.length === 0) notFound()
  return (
    <>
      <LandingHeader />
      <main>
        <Container className="pt-12 pb-16 md:pt-24 md:pb-24">
          <div className="mx-auto flex max-w-192 flex-col gap-10 md:gap-16">
            <div className="flex flex-col gap-3 md:gap-4">
              <p className="text-md font-semibold text-secondary">Blog</p>
              <h1 className="text-display-sm font-semibold text-primary md:text-display-md">The rent questions, answered</h1>
              <p className="text-lg text-tertiary md:text-xl">{description}</p>
            </div>
            <ul>{articles.map((a) => <ArticleRow key={a.slug} article={a} />)}</ul>
          </div>
        </Container>
      </main>
      <Footer orgNumber={details.orgNumber} showBlogLink />
    </>
  )
}
