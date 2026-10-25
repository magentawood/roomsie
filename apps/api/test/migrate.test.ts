import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import journal from '../drizzle/meta/_journal.json'
import { createTestDb, migrationsFolder, type TestDb } from './db'
import { migrateAndSeed } from '../src/db/migrate-and-seed'
import { lifestyleAxes, mustHaves } from '../src/db/schema'

const dbState = async ({ db }: TestDb) => ({
  migrations: (await db.execute(sql`select count(*)::int as n from drizzle.__drizzle_migrations`))[0]!.n,
  axes: await db.select().from(lifestyleAxes).orderBy(lifestyleAxes.key),
  mustHaves: await db.select().from(mustHaves).orderBy(mustHaves.key),
})

describe('migrateAndSeed', () => {
  it('applies each migration and the seed to an empty database, and a second run changes nothing', async () => {
    const testDb = await createTestDb({ migrated: false })
    try {
      await migrateAndSeed(testDb.db, migrationsFolder)
      const first = await dbState(testDb)
      expect(first.migrations).toBe(journal.entries.length)
      expect(first.axes).not.toHaveLength(0)
      expect(first.mustHaves).not.toHaveLength(0)

      await migrateAndSeed(testDb.db, migrationsFolder)
      expect(await dbState(testDb)).toEqual(first)
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
      const broken = { ...last, idx: last.idx + 1, when: last.when + 1, tag: '9999_broken' }
      writeFileSync(join(folder, 'meta/_journal.json'), JSON.stringify({ ...journal, entries: [...journal.entries, broken] }))
      writeFileSync(join(folder, '9999_broken.sql'), 'CREATE TABLE half_done (id int);\n--> statement-breakpoint\nSELECT * FROM no_such_table;')

      await expect(migrateAndSeed(testDb.db, folder)).rejects.toThrow()
      expect((await testDb.db.execute(sql`select to_regclass('half_done') as t`))[0]!.t).toBeNull()
    } finally {
      rmSync(folder, { recursive: true })
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
