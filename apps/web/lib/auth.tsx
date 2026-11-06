'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FirebaseError } from 'firebase/app'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, type User } from 'firebase/auth'
import { reportError } from '@roomsie/config/report'
import { refusalOf } from './api'
import { forgetChat } from './chat'
import { claimVisitorChat } from './claim'
import { firebaseAuth } from './firebase'

/** `signIn` gives the user, or null when the person closes the popup. */
type Auth = { user: User | null; loading: boolean; signIn: () => Promise<User | null>; signOut: () => Promise<void> }

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({ user: null, loading: true })
  const uid = useRef<string | null>(null)
  const { mutate: claim } = useMutation({
    mutationFn: claimVisitorChat,
    onSuccess: async (claimed) => {
      if (!claimed) return
      // queries.ts imports this file, so its keys load at run time.
      const { queryKeys } = await import('./queries')
      // The goal of the chat on the screen now belongs to the account.
      const changed = [queryKeys.profile, ['goal']]
      await Promise.all(changed.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
    },
    // The invite gate (T-33) refuses the account, and the chat stays a visitor chat.
    onError: (err) => { if (!refusalOf(err)) reportError(err, { where: 'claim' }) },
  })
  useEffect(() => onAuthStateChanged(firebaseAuth(), (user) => {
    // The cache holds one account. A change of account, in any tab, empties it.
    if (uid.current !== (user?.uid ?? null)) queryClient.clear()
    uid.current = user?.uid ?? null
    setState({ user, loading: false })
    if (user) claim(user)
  }), [queryClient, claim])
  const value: Auth = {
    ...state,
    signIn: () =>
      signInWithPopup(firebaseAuth(), new GoogleAuthProvider()).then(
        (credential) => credential.user,
        (err: unknown) => {
          if (err instanceof FirebaseError && err.code === 'auth/popup-closed-by-user') return null
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
      forgetChat()
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
