'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setReportUser } from '@roomsie/config/report'
import { InviteOnlyScreen } from '../components/shell/invite-only'
import { ApiError } from '../lib/api'
import { AuthProvider, useAuth } from '../lib/auth'
import { refusalOf } from '../lib/invites'
import { LiveMessages } from '../lib/live'
import { useMe } from '../lib/queries'

export function Providers({ children }: { children: ReactNode }) {
  // A 4xx does not change on a retry. Thus, the gate shows at once (T-33).
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: (count, err) => count < 3 && !(err instanceof ApiError && err.status < 500) } } }))
  return (
    <QueryClientProvider client={client}>
      <AuthProvider><LiveMessages><ReportUserWhenSignedIn /><InviteGate>{children}</InviteGate></LiveMessages></AuthProvider>
    </QueryClientProvider>
  )
}

/** Each error event of this browser carries the users.id of the signed-in person (T-07). */
function ReportUserWhenSignedIn() {
  const { user } = useAuth()
  return user && <ReportUserId key={user.uid} />
}

function ReportUserId() {
  const id = useMe().data?.id
  useEffect(() => {
    if (!id) return
    setReportUser(id)
    return () => setReportUser(null)
  }, [id])
  return null
}

/** A signed-in person that the gate refuses sees only the invite-only screen (T-33). */
function InviteGate({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user ? <RefusedOrPage key={user.uid}>{children}</RefusedOrPage> : children
}

function RefusedOrPage({ children }: { children: ReactNode }) {
  const refusal = refusalOf(useMe().error)
  return refusal ? <InviteOnlyScreen refusal={refusal} /> : children
}
