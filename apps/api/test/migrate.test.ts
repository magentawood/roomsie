import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createTestDb, migrationsFolder, type TestDb } from './db'
import { migrateAndSeed } from '../src/db/migrate'
import { lifestyleAxes, mustHaves } from '../src/db/schema'

type Journal = { entries: { idx: number; when: number; tag: string }[] }
const journal: Journal = JSON.parse(readFileSync(join(migrationsFolder, 'meta/_journal.json'), 'utf8'))

const appliedCount = async ({ db }: TestDb) =>
  (await db.execute(sql`select count(*)::int as n from drizzle.__drizzle_migrations`))[0]!.n

const snapshot = async (testDb: TestDb) => ({
  migrations: await appliedCount(testDb),
  axes: await testDb.db.select().from(lifestyleAxes).orderBy(lifestyleAxes.key),
  mustHaves: await testDb.db.select().from(mustHaves).orderBy(mustHaves.key),
})

describe('migrateAndSeed', () => {
  it('applies each migration and the seed to an empty database, and a second run changes nothing', async () => {
    const testDb = await createTestDb({ migrated: false })
    try {
      await migrateAndSeed(testDb.db, migrationsFolder)
      const first = await snapshot(testDb)
      expect(first.migrations).toBe(journal.entries.length)
      expect(first.axes).toHaveLength(8)
      expect(first.mustHaves).toHaveLength(7)

      await migrateAndSeed(testDb.db, migrationsFolder)
      expect(await snapshot(testDb)).toEqual(first)
    } finally {
      await testDb.drop()
    }
  })

  it('fails on a bad migration, and rolls the database back', async () => {
    const testDb = await createTestDb()
    const folder = mkdtempSync(join(tmpdir(), 'migrations-'))
    try {
      cpSync(migrationsFolder, folder, { recursive: true })
      const last = journal.entries.at(-1)!
      const broken = { idx: last.idx + 1, version: '7', when: last.when + 1, tag: '9999_broken', breakpoints: true }
      writeFileSync(join(folder, 'meta/_journal.json'), JSON.stringify({ ...journal, entries: [...journal.entries, broken] }))
      writeFileSync(join(folder, '9999_broken.sql'), 'CREATE TABLE half_done (id int);\n--> statement-breakpoint\nSELECT * FROM no_such_table;')

      await expect(migrateAndSeed(testDb.db, folder)).rejects.toThrow()
      expect(await appliedCount(testDb)).toBe(journal.entries.length)
      expect((await testDb.db.execute(sql`select to_regclass('half_done') as t`))[0]!.t).toBeNull()
    } finally {
      await testDb.drop()
    }
  })
})

describe('the migration journal', () => {
  it('dates each migration after the one before it', () => {
    // Drizzle skips a migration that is older than the last one applied.
    const dates = journal.entries.map((e) => e.when)
    expect(dates).toEqual([...new Set(dates)].sort((a, b) => a - b))
  })
})
