'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../lib/auth'
import { LiveMessages } from '../lib/live'

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <AuthProvider><LiveMessages>{children}</LiveMessages></AuthProvider>
    </QueryClientProvider>
  )
}
