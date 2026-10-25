'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { FirebaseError } from 'firebase/app'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, type User } from 'firebase/auth'
import { firebaseAuth } from './firebase'

type Auth = { user: User | null; loading: boolean; signIn: () => Promise<void> }

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({ user: null, loading: true })
  useEffect(() => onAuthStateChanged(firebaseAuth(), (user) => setState({ user, loading: false })), [])
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
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth needs an AuthProvider')
  return auth
}
