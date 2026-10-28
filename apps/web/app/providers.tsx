'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setReportUser } from '@roomsie/config/report'
import { InviteOnlyScreen } from '../components/shell/invite-only'
import { refusalOf } from '../lib/api'
import { AuthProvider, useAuth } from '../lib/auth'
import { LiveMessages } from '../lib/live'
import { useMe } from '../lib/queries'

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <AuthProvider><LiveMessages><SignedIn>{children}</SignedIn></LiveMessages></AuthProvider>
    </QueryClientProvider>
  )
}

function SignedIn({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user ? <GateOrApp key={user.uid}>{children}</GateOrApp> : children
}

/** Each error event of this browser carries the users.id (T-07). A person that the gate refuses sees only its screen (T-33). */
function GateOrApp({ children }: { children: ReactNode }) {
  const me = useMe()
  const id = me.data?.id
  useEffect(() => {
    if (!id) return
    setReportUser(id)
    return () => setReportUser(null)
  }, [id])
  const refusal = refusalOf(me.error)
  return refusal ? <InviteOnlyScreen refusal={refusal} /> : children
}
