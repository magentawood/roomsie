import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createDb } from '../src/db/client'

export const adminUrl = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres'
const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

export type TestDb = Awaited<ReturnType<typeof createTestDb>>

/** A fresh database with every committed migration applied. Call drop() when done. */
export async function createTestDb() {
  const name = `test_${randomUUID().replaceAll('-', '')}`
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} })
  await admin.unsafe(`create database ${name}`)

  const url = new URL(adminUrl)
  url.pathname = `/${name}`
  const db = createDb(url.toString())
  if (existsSync(`${migrationsFolder}/meta/_journal.json`)) await migrate(db, { migrationsFolder })

  async function drop() {
    await db.$client.end()
    await admin.unsafe(`drop database ${name}`)
    await admin.end()
  }
  return { db, drop }
}
