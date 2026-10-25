import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { createDb } from './db/client'
import { migrateAndSeed } from './db/migrate-and-seed'

const db = createDb(z.url().parse(process.env.DATABASE_URL))
try {
  await migrateAndSeed(db, fileURLToPath(new URL('../drizzle', import.meta.url)))
} finally {
  await db.$client.end()
}
