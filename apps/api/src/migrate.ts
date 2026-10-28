import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createAnalyticsDb } from './analytics/client'
import { createDb } from './db/client'
import { unsetIfEmpty } from './env-values'
import { migrateAndSeed } from './db/migrate-and-seed'

const db = createDb(z.url().parse(process.env.DATABASE_URL))
await migrateAndSeed(db, fileURLToPath(new URL('../drizzle', import.meta.url)))
await db.$client.end()

// The analytics database has its own migrations (T-24). Unset: no events, so nothing to migrate.
const analyticsUrl = unsetIfEmpty.pipe(z.url().optional()).parse(process.env.ANALYTICS_DATABASE_URL)
if (analyticsUrl) {
  const analytics = createAnalyticsDb(analyticsUrl)
  await migrate(analytics, { migrationsFolder: fileURLToPath(new URL('../drizzle-analytics', import.meta.url)) })
  await analytics.$client.end()
}
