import { noSiteDetails, siteResponse, type SiteResponse } from '@roomsie/contract'
import { apiUrl } from './api'

const noSite: SiteResponse = { quotes: [], details: noSiteDetails }

/** The networks of "Follow us", in the order of the design. */
export const socialNetworks = [
  { key: 'instagram', name: 'Instagram' },
  { key: 'whatsapp', name: 'WhatsApp' },
  { key: 'facebook', name: 'Facebook' },
  { key: 'linkedin', name: 'LinkedIn' },
] as const

/** For the server render of the landing page. With no answer from the API in 5 seconds, the page shows no quotes and no details (T-23a). */
export async function getSite(): Promise<SiteResponse> {
  try {
    const res = await fetch(`${apiUrl}/v1/site`, { signal: AbortSignal.timeout(5000) })
    return res.ok ? siteResponse.parse(await res.json()) : noSite
  } catch {
    return noSite
  }
}
