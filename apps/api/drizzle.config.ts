import { defineConfig } from 'drizzle-kit'

// ADR 0006: schema.ts is the single source of truth; migrations are
// generated from it as plain SQL and committed.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
})
