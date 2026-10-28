import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { privacyOptions } from '@roomsie/config/report'

// Before the schemas load: jitless stops the eval probe of Zod, which the CSP reports (T-52).
z.config({ jitless: true })

Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, ...privacyOptions })
