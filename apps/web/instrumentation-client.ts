import { z } from 'zod'

// Before the schemas load: jitless stops the eval probe of Zod, which the CSP reports (T-52).
z.config({ jitless: true })
