'use client'

import { useQuery } from '@tanstack/react-query'
import { healthResponse } from '@roomsie/contract'

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export default function Home() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => healthResponse.parse(await (await fetch(`${apiUrl}/v1/health`)).json()),
  })

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">roomsie</h1>
      <p>API: {health.isPending ? 'checking' : health.isError ? 'unreachable' : health.data.status}</p>
    </main>
  )
}
