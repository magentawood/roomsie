import type { Metadata } from 'next'
import { Callout, Contact, Footer } from '../components/landing/contact'
import { Hero, LandingHeader } from '../components/landing/hero'
import { HowItWorks } from '../components/landing/how-it-works'
import { Problems } from '../components/landing/problems'
import { Quotes } from '../components/landing/quotes'
import { SearchStrip } from '../components/landing/search-strip'
import { getArticles } from '../lib/articles'
import { getSite } from '../lib/site'

export const metadata: Metadata = {
  title: 'Roomsie: find where you’ll live, and who with',
  description: 'Roomsie finds flats, flatmates and rented rooms in Mumbai that fit your preferences and your needs. Tell it what you want in English or Hinglish.',
}

/** The landing page of the designs (T-23a). The server renders it, because it is a search page (ADR-0007). */
export default async function Home() {
  const [{ quotes, details }, articles] = await Promise.all([getSite(), getArticles().catch(() => [])])
  return (
    <>
      <LandingHeader />
      <main>
        <Hero />
        <Problems />
        <SearchStrip />
        <HowItWorks />
        {quotes.length > 0 && <Quotes quotes={quotes} />}
        <Callout />
        <Contact details={details} />
      </main>
      <Footer orgNumber={details.orgNumber} showBlogLink={articles.length > 0} />
    </>
  )
}
