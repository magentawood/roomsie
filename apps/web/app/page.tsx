import { HealthResponse } from '@roomsie/contract'

// Placeholder home. It proves web can reach the API and parse its reply
// with the shared contract. The real landing page is T-23a.
export const dynamic = 'force-dynamic'

async function apiHealth(): Promise<HealthResponse | null> {
  const base = process.env.API_URL ?? 'http://localhost:4000'
  try {
    const res = await fetch(`${base}/health`, { cache: 'no-store' })
    if (!res.ok) return null
    return HealthResponse.parse(await res.json())
  } catch {
    return null
  }
}

export default async function Home() {
  const health = await apiHealth()

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold">roomsie</h1>
      <p>Scaffold is running.</p>
      <p className="text-sm">
        API:{' '}
        {health ? (
          <span className="text-green-700">ok at {health.time}</span>
        ) : (
          <span className="text-red-700">not reachable</span>
        )}
      </p>
    </main>
  )
}
