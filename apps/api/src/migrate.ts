// The deploy runs this in a one-off container, before the new API starts (ADR-0018).
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { createDb } from './db/client'
import { migrateAndSeed } from './db/migrate'

const db = createDb(z.url().parse(process.env.DATABASE_URL))
try {
  await migrateAndSeed(db, fileURLToPath(new URL('../drizzle', import.meta.url)))
} finally {
  await db.$client.end()
}
