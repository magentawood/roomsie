'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FirebaseError } from 'firebase/app'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { healthResponse, meResponse } from '@roomsie/contract'
import { firebaseAuth } from '../lib/firebase'

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [signInError, setSignInError] = useState<string | null>(null)
  useEffect(() => onAuthStateChanged(firebaseAuth(), setUser), [])

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
    queryFn: async () => {
      if (!user) throw new Error('Signed out')
      // getIdToken() gives the cached token, or a new one near its expiry. We never store it.
      const res = await fetch(`${apiUrl}/v1/me`, { headers: { authorization: `Bearer ${await user.getIdToken()}` } })
      if (!res.ok) throw new Error(`/v1/me failed: ${res.status}`)
      return meResponse.parse(await res.json())
    },
  })

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">roomsie</h1>
      <p>API: {health.isPending ? 'checking' : health.isError ? 'unreachable' : health.data.status}</p>
      {user ? (
        <>
          <p>User: {me.isPending ? 'loading' : me.isError ? me.error.message : `${me.data.id} (${me.data.status})`}</p>
          <button type="button" onClick={() => signOut(firebaseAuth())}>Sign out</button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() =>
              signInWithPopup(firebaseAuth(), new GoogleAuthProvider()).then(
                () => setSignInError(null),
                (err: unknown) =>
                  setSignInError(
                    err instanceof FirebaseError && err.code === 'auth/popup-closed-by-user' ? null : String(err),
                  ),
              )
            }
          >
            Sign in with Google
          </button>
          {signInError && <p>{signInError}</p>}
        </>
      )}
    </main>
  )
}
