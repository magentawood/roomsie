import { desc } from 'drizzle-orm'
import { noSiteDetails, type SiteDetails } from '@roomsie/contract'
import type { Db } from '../db/client'
import { quotes, siteDetails } from '../db/schema'

export async function latestDetails(db: Db): Promise<SiteDetails> {
  const [row] = await db.select({
    instagram: siteDetails.instagram, whatsapp: siteDetails.whatsapp, facebook: siteDetails.facebook, linkedin: siteDetails.linkedin,
    contactEmail: siteDetails.contactEmail, orgNumber: siteDetails.orgNumber,
  }).from(siteDetails).orderBy(desc(siteDetails.createdAt)).limit(1)
  return row ?? noSiteDetails
}

export const quoteCount = (db: Db) => db.$count(quotes)
