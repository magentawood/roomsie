import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs/config'

const config: NextConfig = {
  transpilePackages: ['@roomsie/contract', '@roomsie/config'],
  // The share cards read the font and the covers from disk, so the function of each card needs these files (T-37).
  outputFileTracingIncludes: { '/blog/**': ['./assets/**', './public/blog/**'] },
  // The project has one agent file, CONTEXT.md. Next must not write its own.
  agentRules: false,
  // Google's account chooser names the sign-in domain. With NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=roomsie.in, the sign-in pages
  // of Firebase come through our own domain, so it says "to continue to roomsie.in".
  async rewrites() {
    const firebase = `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`
    return [
      { source: '/__/auth/:path*', destination: `${firebase}/__/auth/:path*` },
      { source: '/__/firebase/:path*', destination: `${firebase}/__/firebase/:path*` },
    ]
  },
}

// The events go through our own path, so an ad blocker does not drop them. No source maps: their upload needs a secret in the web (T-07).
export default withSentryConfig(config, {
  tunnelRoute: '/monitoring',
  sourcemaps: { disable: true },
  telemetry: false,
  silent: true,
  suppressOnRouterTransitionStartWarning: true,
})
