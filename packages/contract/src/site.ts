import { z } from 'zod'
import { optionalText, requiredText } from './shared'

/** The number of quotes that the landing page shows. The section shows only when this many exist (T-23a). */
export const landingQuoteCount = 5

/** A moderator adds a quote only after its person agreed to show it with this name. */
export const quoteBody = z.strictObject({ text: requiredText(200), name: requiredText(40), consent: z.literal(true) })
export const quote = z.object({ id: z.uuid(), text: z.string(), name: z.string() })
export type Quote = z.infer<typeof quote>
/** All the quotes, newest first. */
export const adminQuotesResponse = z.object({ quotes: z.array(quote.extend({ createdAt: z.iso.datetime() })) })

const link = z.url({ protocol: /^https$/ }).max(300).nullable()
/** The parts of the landing page that a moderator sets. A null part does not show. */
export const siteDetailsBody = z.strictObject({
  instagram: link,
  whatsapp: link,
  facebook: link,
  linkedin: link,
  contactEmail: z.email().max(254).nullable(),
  orgNumber: optionalText(40),
})
export type SiteDetails = z.infer<typeof siteDetailsBody>
export const noSiteDetails: SiteDetails = { instagram: null, whatsapp: null, facebook: null, linkedin: null, contactEmail: null, orgNumber: null }

/** `quotes` is empty until enough quotes exist, then it has the newest. */
export const siteResponse = z.object({ quotes: z.array(quote).max(landingQuoteCount), details: siteDetailsBody })
export type SiteResponse = z.infer<typeof siteResponse>
