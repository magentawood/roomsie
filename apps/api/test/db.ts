import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import postgres, { type Sql } from 'postgres'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createAnalyticsDb } from '../src/analytics/client'
import { createDb } from '../src/db/client'

export const adminUrl = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres'
export const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

export type TestDb = Awaited<ReturnType<typeof createTestDb>>

/** Call drop() when done. */
async function disposableDatabase<D extends PostgresJsDatabase<Record<string, unknown>> & { $client: Sql }>(connect: (url: string) => D, folder: string, migrated = true) {
  const name = `test_${randomUUID().replaceAll('-', '')}`
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} })
  await admin.unsafe(`create database ${name}`)

  const url = new URL(adminUrl)
  url.pathname = `/${name}`
  const db = connect(url.toString())
  if (migrated && existsSync(`${folder}/meta/_journal.json`)) await migrate(db, { migrationsFolder: folder })

  async function drop() {
    await db.$client.end()
    await admin.unsafe(`drop database ${name}`)
    await admin.end()
  }
  return { db, drop }
}

export const createTestDb = ({ migrated = true } = {}) => disposableDatabase(createDb, migrationsFolder, migrated)
export const createTestAnalyticsDb = () => disposableDatabase(createAnalyticsDb, fileURLToPath(new URL('../drizzle-analytics', import.meta.url)))
