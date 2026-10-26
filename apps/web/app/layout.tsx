import type { ReactNode } from 'react'
import { Figtree } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

/** next/font serves the font from our own domain, so no request goes to Google at run time. */
const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap' })

export const metadata = { title: 'roomsie' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
