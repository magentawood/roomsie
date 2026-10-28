import { noSiteDetails, siteResponse, type SiteResponse } from '@roomsie/contract'
import { apiUrl } from './api'

const noSite: SiteResponse = { quotes: [], details: noSiteDetails }

/** The networks of "Follow us", in the order of the design. */
export const socialNetworks = [
  { key: 'instagram', name: 'Instagram', example: 'https://www.instagram.com/…' },
  { key: 'whatsapp', name: 'WhatsApp', example: 'https://wa.me/…' },
  { key: 'facebook', name: 'Facebook', example: 'https://www.facebook.com/…' },
  { key: 'linkedin', name: 'LinkedIn', example: 'https://www.linkedin.com/company/…' },
] as const

/** For the server render of the landing page. With no answer from the API in 5 seconds, the page shows no quotes and no details (T-23a). */
export async function getSite(): Promise<SiteResponse> {
  try {
    // A moderator's change to the quotes or the details shows within 60 seconds (T-23a).
    const res = await fetch(`${apiUrl}/v1/site`, { signal: AbortSignal.timeout(5000), next: { revalidate: 60 } })
    return res.ok ? siteResponse.parse(await res.json()) : noSite
  } catch {
    return noSite
  }
}
