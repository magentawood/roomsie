'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FirebaseError } from 'firebase/app'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, type User } from 'firebase/auth'
import { firebaseAuth } from './firebase'

type Auth = { user: User | null; loading: boolean; signIn: () => Promise<void>; signOut: () => Promise<void> }

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({ user: null, loading: true })
  const uid = useRef<string | null>(null)
  useEffect(() => onAuthStateChanged(firebaseAuth(), (user) => {
    // The cache holds one account. A change of account, in any tab, empties it.
    if (uid.current !== (user?.uid ?? null)) queryClient.clear()
    uid.current = user?.uid ?? null
    setState({ user, loading: false })
  }), [queryClient])
  const value: Auth = {
    ...state,
    signIn: () =>
      signInWithPopup(firebaseAuth(), new GoogleAuthProvider()).then(
        () => undefined,
        (err: unknown) => {
          if (err instanceof FirebaseError && err.code === 'auth/popup-closed-by-user') return
          throw err
        },
      ),
    signOut: async () => {
      const user = firebaseAuth().currentUser
      // The alerts of the account stop on this browser (T-55). A slow network does not hold the sign-out.
      if (user) {
        const stopPush = import('./push').then(({ turnOffPush }) => turnOffPush(user))
        await Promise.race([stopPush, new Promise((done) => setTimeout(done, 5000))]).catch(() => undefined)
      }
      sessionStorage.clear()
      await firebaseSignOut(firebaseAuth())
    },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth needs an AuthProvider')
  return auth
}

/** The signed-in user. SignInGate shows its children only with a user. */
export function useUser() {
  const { user } = useAuth()
  if (!user) throw new Error('useUser needs a SignInGate')
  return user
}
