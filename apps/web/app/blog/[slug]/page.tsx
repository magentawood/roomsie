import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from '@untitledui/icons'
import { Portrait } from '../../../components/blog/portrait'
import { Callout, Footer } from '../../../components/landing/contact'
import { LandingHeader } from '../../../components/landing/hero'
import { Container } from '../../../components/landing/parts'
import { articlePath, checkedOn, getArticle } from '../../../lib/articles'
import { getSite, siteUrl } from '../../../lib/site'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticle((await params).slug)
  if (!article) return {}
  return {
    title: article.seoTitle,
    description: article.seoDescription,
    alternates: { canonical: articlePath(article.slug) },
    openGraph: { type: 'article', url: articlePath(article.slug) },
  }
}

const passageClasses = 'flex flex-col gap-4 text-lg text-secondary [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_h3]:font-semibold [&_h3]:text-primary [&_li]:ml-6 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_strong]:font-semibold [&_strong]:text-primary [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2'

export default async function ArticlePage({ params }: Props) {
  const [article, { details }] = await Promise.all([getArticle((await params).slug), getSite()])
  if (!article) notFound()
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.seoDescription,
    dateModified: article.dateChecked,
    author: { '@type': 'Person', name: article.author },
    publisher: { '@type': 'Organization', name: 'Roomsie', url: siteUrl },
    mainEntityOfPage: `${siteUrl}${articlePath(article.slug)}`,
    ...(article.coverImage && { image: `${siteUrl}${article.coverImage}` }),
  }
  return (
    <>
      <LandingHeader />
      <main>
        <Container className="pt-8 pb-16 md:pt-16 md:pb-24">
          <article className="mx-auto flex max-w-180 flex-col gap-6 md:gap-8">
            <Link href="/blog" className="flex w-fit items-center gap-1.5 rounded-sm text-sm font-semibold text-tertiary outline-focus-ring hover:text-tertiary_hover focus-visible:outline-2">
              <ArrowLeft size={20} aria-hidden />All articles
            </Link>
            <header className="flex flex-col gap-3 md:gap-4">
              <h1 className="text-display-sm font-semibold text-primary md:text-display-md">{article.title}</h1>
              <p className="text-md text-tertiary">{checkedOn(article.dateChecked)}</p>
            </header>
            <div className="flex items-center gap-3 text-md">
              <Portrait article={article} size="md" />
              <p className="flex flex-col"><span className="font-semibold text-primary">{article.author}</span><span className="text-tertiary">{article.authorLine}</span></p>
            </div>
            {article.coverImage && <img src={article.coverImage} alt={article.coverAlt ?? ''} className="aspect-video w-full rounded-lg object-cover md:rounded-xl" />}
            <hr className="border-secondary" />
            <div className="flex flex-col gap-8 md:gap-10">
              {article.passages.map((p, i) => (
                <section key={i} className="flex flex-col gap-3 md:gap-4">
                  {p.heading && <h2 className="text-xl font-semibold text-primary md:text-display-xs">{p.heading}</h2>}
                  {/* The API made this HTML from a file of the repo, with raw HTML escaped. */}
                  <div className={passageClasses} dangerouslySetInnerHTML={{ __html: p.html }} />
                </section>
              ))}
            </div>
          </article>
        </Container>
        <Callout />
      </main>
      <Footer orgNumber={details.orgNumber} showBlogLink />
      {/* A data block, not a script: the browser does not run it, so the policy needs no nonce for it. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll('<', '\\u003c') }} />
    </>
  )
}
