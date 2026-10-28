import { z } from 'zod'

// Here, so it runs before the schemas load. Zod tries eval, and the CSP blocks it (T-52).
z.config({ jitless: true })
