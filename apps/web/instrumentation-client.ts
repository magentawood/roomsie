import { z } from 'zod'
import { startSentry } from './lib/sentry'

// Before the schemas load: jitless stops the eval probe of Zod, which the CSP reports (T-52).
z.config({ jitless: true })

startSentry()
