'use client'

import { useQuery } from '@tanstack/react-query'
import { healthResponse } from '@roomsie/contract'

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export default function Home() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/v1/health`)
      if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
      return healthResponse.parse(await res.json())
    },
  })

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">roomsie</h1>
      <p>API: {health.isPending ? 'checking' : health.isError ? 'unreachable' : health.data.status}</p>
    </main>
  )
}
