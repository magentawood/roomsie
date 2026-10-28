'use client'

import { useEffect } from 'react'
import { AlertCircle } from '@untitledui/icons'
import { reportError } from '@roomsie/config/report'
import { Button } from '../components/ui/button'
import { EmptyState } from '../components/ui/empty-state'

/** A crash of a page. React catches it, so Sentry gets it only from here. The server already reported an error with a digest (T-07). */
export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    if (!error.digest) reportError(error, { where: 'page' })
  }, [error])
  return (
    <main className="flex min-h-dvh flex-col px-5">
      <EmptyState icon={AlertCircle} title="Something went wrong" action={<Button variant="primary" size="md" onClick={retry}>Try again</Button>}>
        This page hit an error. Try again, or come back in a minute.
      </EmptyState>
    </main>
  )
}
