import type { Viewport } from 'next'
import type { ReactNode } from 'react'
import { Figtree, Fredoka } from 'next/font/google'
import { connection } from 'next/server'
import { siteUrl } from '../lib/site'
import { Providers } from './providers'
import './globals.css'

/** next/font serves the font from our own domain, so no request goes to Google at run time. */
const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap' })
/** The rounded letters of the mascots' waits, in one weight. */
const fredoka = Fredoka({ subsets: ['latin'], weight: '600', variable: '--font-fredoka', display: 'swap' })

export const metadata = { title: 'Roomsie', metadataBase: new URL(siteUrl) }
/** The keyboard of a phone makes the page shorter, so a chat input sits on the keyboard, as in a chat app. */
export const viewport: Viewport = { width: 'device-width', initialScale: 1, interactiveWidget: 'resizes-content' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  // A static page cannot have the new nonce of each request, so each page renders on each request (T-52).
  await connection()
  return (
    <html lang="en" className={`${figtree.variable} ${fredoka.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
