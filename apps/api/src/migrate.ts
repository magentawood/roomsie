import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { createDb } from './db/client'
import { migrateAndSeed } from './db/migrate-and-seed'

const db = createDb(z.url().parse(process.env.DATABASE_URL))
await migrateAndSeed(db, fileURLToPath(new URL('../drizzle', import.meta.url)))
await db.$client.end()
