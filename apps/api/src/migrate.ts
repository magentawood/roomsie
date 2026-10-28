import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createAnalyticsDb } from './analytics/client'
import { createDb } from './db/client'
import { migrateAndSeed } from './db/migrate-and-seed'

const db = createDb(z.url().parse(process.env.DATABASE_URL))
await migrateAndSeed(db, fileURLToPath(new URL('../drizzle', import.meta.url)))
await db.$client.end()

// Unset: no events, so nothing to migrate (T-24).
if (process.env.ANALYTICS_DATABASE_URL) {
  const analytics = createAnalyticsDb(z.url().parse(process.env.ANALYTICS_DATABASE_URL))
  await migrate(analytics, { migrationsFolder: fileURLToPath(new URL('../drizzle-analytics', import.meta.url)) })
  await analytics.$client.end()
}
