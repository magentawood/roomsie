'use client'

import PageError from './error'
import './globals.css'

/** A crash of the root layout. It replaces the layout, so it has its own html and body (T-07). */
export default function GlobalError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <PageError {...props} />
      </body>
    </html>
  )
}
