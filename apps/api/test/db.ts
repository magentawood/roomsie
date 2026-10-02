import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import * as schema from '../src/db/schema'

export const adminUrl = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres'

/** A fresh database with every committed migration applied. Call drop() when done. */
export async function createTestDb() {
  const name = `test_${randomUUID().replaceAll('-', '')}`
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} })
  await admin.unsafe(`create database ${name}`)

  const url = new URL(adminUrl)
  url.pathname = `/${name}`
  const client = postgres(url.toString(), { max: 1, onnotice: () => {} })
  const db = drizzle(client, { schema })
  if (existsSync('drizzle/meta/_journal.json')) await migrate(db, { migrationsFolder: 'drizzle' })

  async function drop() {
    await client.end()
    await admin.unsafe(`drop database ${name}`)
    await admin.end()
  }
  return { db, client, drop }
}
