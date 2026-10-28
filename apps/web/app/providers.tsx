'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setReportUser } from '@roomsie/config/report'
import { AuthProvider, useAuth } from '../lib/auth'
import { LiveMessages } from '../lib/live'
import { useMe } from '../lib/queries'

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <AuthProvider><LiveMessages><ReportUser />{children}</LiveMessages></AuthProvider>
    </QueryClientProvider>
  )
}

/** Each error event of this browser carries the users.id of the signed-in person (T-07). */
function ReportUser() {
  const { user } = useAuth()
  return user && <ReportMe key={user.uid} />
}

function ReportMe() {
  const id = useMe().data?.id
  useEffect(() => {
    if (!id) return
    setReportUser(id)
    return () => setReportUser(null)
  }, [id])
  return null
}
