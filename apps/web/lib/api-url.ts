/** Its own module, so the proxy does not load the schemas of the contract (T-52). */
export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

/** A read of public data on the server: it waits at most 5 seconds, and the cache keeps it for 60. */
export const cachedRead = () => ({ signal: AbortSignal.timeout(5000), next: { revalidate: 60 } })
