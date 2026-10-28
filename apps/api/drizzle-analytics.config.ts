import { defineConfig } from 'drizzle-kit'
import { z } from 'zod'

// The analytics database has its own migrations (ADR-0012).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/analytics/schema.ts',
  out: './drizzle-analytics',
  dbCredentials: { url: z.url().parse(process.env.ANALYTICS_DATABASE_URL) },
})
