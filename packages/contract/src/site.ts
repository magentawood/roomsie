import { z } from 'zod'
import { requiredText } from './shared'

/** The number of quotes that the landing page shows. The section shows only when this many exist (T-23a). */
export const landingQuoteCount = 5

/** A moderator adds a quote only after its person agreed to show it with this name. */
export const quoteBody = z.strictObject({ text: requiredText(200), name: requiredText(40), consent: z.literal(true) })
export type QuoteBody = z.infer<typeof quoteBody>
export const quote = z.object({ id: z.uuid(), text: z.string(), name: z.string() })
export type Quote = z.infer<typeof quote>
/** All the quotes, newest first. */
export const adminQuotesResponse = z.object({ quotes: z.array(quote.extend({ createdAt: z.iso.datetime() })) })
export type AdminQuotesResponse = z.infer<typeof adminQuotesResponse>

const link = z.url({ protocol: /^https$/ }).max(300).nullable()
/** The parts of the landing page that a moderator sets. A null part does not show. */
export const siteDetails = z.strictObject({
  instagram: link,
  whatsapp: link,
  facebook: link,
  linkedin: link,
  contactEmail: z.email().max(254).nullable(),
  orgNumber: requiredText(40).nullable(),
})
export type SiteDetails = z.infer<typeof siteDetails>

/** `quotes` is empty until enough quotes exist, then it has the newest. */
export const siteResponse = z.object({ quotes: z.array(quote).max(landingQuoteCount), details: siteDetails })
export type SiteResponse = z.infer<typeof siteResponse>
