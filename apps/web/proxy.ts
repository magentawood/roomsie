import { NextResponse, type NextRequest, type ProxyConfig } from 'next/server'
import { apiUrl } from './lib/api-url'

const dev = process.env.NODE_ENV === 'development'
// The hosts of API_R2_PUBLIC_URL and API_ID_BUCKET in deploy-api.yml.
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
    // Vercel lacks the R2 account and the Supabase project, so these two are wildcards (T-52).
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
    // The files of public. Each other path gets the policy, also a wrong URL such as /a.php.
    source: '/((?!_next/static|_next/image|.*\\.(?:jpg|js|mp4|png|svg|webp)$).*)',
    missing: [
      { type: 'header', key: 'next-router-prefetch' },
      { type: 'header', key: 'purpose', value: 'prefetch' },
    ],
  }],
} satisfies ProxyConfig
