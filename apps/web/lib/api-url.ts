/** Its own module, so the proxy does not load the schemas of the contract (T-52). */
export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

/** Public data changes rarely, so a view takes the cached answer and does not wait for the API. */
export const cachedFetchOptions = () => ({ signal: AbortSignal.timeout(5000), next: { revalidate: 60 } })
