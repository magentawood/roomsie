/** Its own module, so the proxy does not load the schemas of the contract (T-52). */
export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
