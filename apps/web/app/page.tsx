'use client'

import { useQuery } from '@tanstack/react-query'
import { signOut } from 'firebase/auth'
import { healthResponse, meResponse } from '@roomsie/contract'
import { api, apiUrl } from '../lib/api'
import { useAuth } from '../lib/auth'
import { firebaseAuth } from '../lib/firebase'
import { Button } from '../components/ui/button'
import { GoogleSignIn } from '../components/shell/google-sign-in'

export default function Home() {
  const { user } = useAuth()

  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/v1/health`)
      if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
      return healthResponse.parse(await res.json())
    },
  })

  const me = useQuery({
    queryKey: ['me', user?.uid],
    enabled: user !== null,
    queryFn: () => api(user!, '/v1/me', meResponse),
  })

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">roomsie</h1>
      {/* Until the landing page of T-23a. */}
      <Button variant="primary" size="lg" href="/chat">Start looking</Button>
      <p>API: {health.isPending ? 'checking' : health.isError ? 'unreachable' : health.data.status}</p>
      {user ? (
        <>
          <p>User: {me.isPending ? 'loading' : me.isError ? me.error.message : `${me.data.id} (${me.data.status})`}</p>
          <button type="button" onClick={() => signOut(firebaseAuth())}>Sign out</button>
        </>
      ) : (
        <GoogleSignIn />
      )}
    </main>
  )
}
