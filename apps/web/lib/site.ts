import { siteResponse, type SiteResponse } from '@roomsie/contract'
import { apiUrl } from './api'

const empty: SiteResponse = {
  quotes: [],
  details: { instagram: null, whatsapp: null, facebook: null, linkedin: null, contactEmail: null, orgNumber: null },
}

/** For the server render of the landing page. With no answer from the API, the page shows no quotes and no details (T-23a). */
export async function getSite(): Promise<SiteResponse> {
  try {
    const res = await fetch(`${apiUrl}/v1/site`, { next: { revalidate: 60 } })
    return res.ok ? siteResponse.parse(await res.json()) : empty
  } catch {
    return empty
  }
}
