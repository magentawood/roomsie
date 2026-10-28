import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createAnalyticsDb } from '../src/analytics/client'
import { createDb } from '../src/db/client'

export const adminUrl = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres'
export const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))
const analyticsMigrationsFolder = fileURLToPath(new URL('../drizzle-analytics', import.meta.url))

export type TestDb = Awaited<ReturnType<typeof createTestDb>>

/** An empty database. Call drop() when done. */
async function disposableDatabase() {
  const name = `test_${randomUUID().replaceAll('-', '')}`
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} })
  await admin.unsafe(`create database ${name}`)
  const url = new URL(adminUrl)
  url.pathname = `/${name}`
  return {
    url: url.toString(),
    async drop() {
      await admin.unsafe(`drop database ${name}`)
      await admin.end()
    },
  }
}

/** Call drop() when done. */
export async function createTestDb({ migrated = true } = {}) {
  const database = await disposableDatabase()
  const db = createDb(database.url)
  if (migrated && existsSync(`${migrationsFolder}/meta/_journal.json`)) await migrate(db, { migrationsFolder })

  async function drop() {
    await db.$client.end()
    await database.drop()
  }
  return { db, drop }
}

/** A migrated analytics database (T-24). Call drop() when done. */
export async function createTestAnalyticsDb() {
  const database = await disposableDatabase()
  const db = createAnalyticsDb(database.url)
  await migrate(db, { migrationsFolder: analyticsMigrationsFolder })

  async function drop() {
    await db.$client.end()
    await database.drop()
  }
  return { db, drop }
}
