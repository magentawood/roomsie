import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { privacyOptions } from '@roomsie/config/report'

// Before the schemas load: jitless stops the eval probe of Zod, which the CSP reports (T-52).
z.config({ jitless: true })

// Errors only, with no tracing (ADR-0014). With no DSN, Sentry stays off. Code reports with `reportError`.
Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, ...privacyOptions })
