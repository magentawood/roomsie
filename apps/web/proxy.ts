import { NextResponse, type NextRequest, type ProxyConfig } from 'next/server'
import { apiUrl } from './lib/api'

const dev = process.env.NODE_ENV === 'development'
// The photo hosts of deploy-api.yml. Vercel does not have the R2 account or the Supabase project, so those are wildcards (T-52).
const photos = 'https://photos.roomsie.in'
const idBucket = 'https://roomsie-id-checks.s3.ap-south-1.amazonaws.com'

/** The browser runs only the scripts with the nonce of this response, so an injected script cannot take the sign-in (ADR-0007). */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const policy = [
    "default-src 'self'",
    // strict-dynamic lets our scripts load more, for example the Google script of Firebase sign-in. Next dev needs eval.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' ${dev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    `img-src 'self' blob: data: ${photos} ${idBucket} https://lh3.googleusercontent.com`,
    "font-src 'self'",
    "media-src 'self'",
    `connect-src 'self' ${new URL(apiUrl).origin} https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaseinstallations.googleapis.com https://fcmregistrations.googleapis.com https://*.r2.cloudflarestorage.com ${idBucket} wss://*.supabase.co`,
    `frame-src https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}`,
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')
  // Next reads the nonce from the policy of the request, and puts it on its own scripts.
  const headers = new Headers(request.headers)
  headers.set('content-security-policy', policy)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('content-security-policy', policy)
  return response
}

export const config = {
  matcher: [{
    // A file has a dot in its path, and a page does not.
    source: '/((?!_next/static|_next/image|.*\\.).*)',
    missing: [
      { type: 'header', key: 'next-router-prefetch' },
      { type: 'header', key: 'purpose', value: 'prefetch' },
    ],
  }],
} satisfies ProxyConfig
