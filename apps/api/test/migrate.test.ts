import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eq, sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import journal from '../drizzle/meta/_journal.json'
import { createTestDb, migrationsFolder, type TestDb } from './db'
import { migrateAndSeed } from '../src/db/migrate-and-seed'
import { areas, connectionRequests, lifestyleAxes, listings, messages, mustHaves, profiles, users } from '../src/db/schema'

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
  }, 20_000)

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
      await testDb.drop()
      rmSync(folder, { recursive: true })
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

describe('the backfill of the notes of accepted requests (0010)', () => {
  it('gives each accepted request with no message its note, at the time of the accept and read by the person who accepted', async () => {
    const testDb = await createTestDb()
    try {
      const { db } = testDb
      const people = await db.insert(users).values(['a', 'b', 'c', 'd'].map((uid) => ({ authProviderId: uid }))).returning()
      const [a, b, c, d] = people.map((u) => u.id) as [string, string, string, string]
      const [pa, pb] = await db.insert(profiles).values([{ userId: a, fullName: 'A' }, { userId: c, fullName: 'C' }]).returning()
      const acceptedAt = new Date('2026-10-26T10:00:00Z')
      const [old, withNote, open] = await db.insert(connectionRequests).values([
        { fromUserId: a, fromProfileId: pa!.id, toUserId: b, note: 'Hi B', status: 'accepted', respondedAt: acceptedAt },
        { fromUserId: c, fromProfileId: pb!.id, toUserId: d, note: 'Hi D', status: 'accepted', respondedAt: acceptedAt },
        { fromUserId: a, fromProfileId: pa!.id, toUserId: c, note: 'Hi C', status: 'pending' },
      ]).returning()
      await db.insert(messages).values({ requestId: withNote!.id, senderUserId: c, text: 'Hi D' })
      const backfill = readFileSync(join(migrationsFolder, '0010_accepted_notes.sql'), 'utf8').split('--> statement-breakpoint')
      await db.transaction(async (tx) => { for (const statement of backfill) await tx.execute(sql.raw(statement)) })

      const notes = await db.select().from(messages).where(eq(messages.requestId, old!.id))
      expect(notes).toMatchObject([{ senderUserId: a, text: 'Hi B', createdAt: acceptedAt }])
      expect(notes[0]!.id[14]).toBe('7')
      expect(await db.select().from(messages).where(eq(messages.requestId, withNote!.id))).toHaveLength(1)
      expect(await db.select().from(messages).where(eq(messages.requestId, open!.id))).toHaveLength(0)
      const [read] = await db.select({ toReadAt: connectionRequests.toReadAt }).from(connectionRequests).where(eq(connectionRequests.id, old!.id))
      expect(read!.toReadAt).toEqual(acceptedAt)
    } finally {
      await testDb.drop()
    }
  })
})

describe('the sub-areas (0011, 0012 and the seed)', () => {
  it('keeps the area group of each listing and profile, and puts the sub-areas under the groups', async () => {
    const testDb = await createTestDb({ migrated: false })
    const folder = mkdtempSync(join(tmpdir(), 'migrations-'))
    try {
      const { db } = testDb
      cpSync(migrationsFolder, folder, { recursive: true })
      writeFileSync(join(folder, 'meta/_journal.json'), JSON.stringify({ ...journal, entries: journal.entries.filter((e) => e.idx <= 10) }))
      await migrate(db, { migrationsFolder: folder })
      await db.execute(sql`insert into areas (slug, name, is_launch_area, sort_order) values ('andheri-goregaon', 'Andheri–Goregaon', true, 1)`)
      const [user] = await db.insert(users).values({ authProviderId: 'a' }).returning()
      await db.insert(profiles).values({ userId: user!.id, fullName: 'A', areas: ['andheri-goregaon'] })
      const [listing] = await db.insert(listings).values({ ownerUserId: user!.id, kind: 'owner_flat', areaSlug: 'andheri-goregaon' }).returning()

      await migrateAndSeed(db, migrationsFolder)
      expect((await db.select({ areaSlug: listings.areaSlug }).from(listings).where(eq(listings.id, listing!.id)))[0]!.areaSlug).toBe('andheri-goregaon')
      expect((await db.select({ areas: profiles.areas }).from(profiles))[0]!.areas).toEqual(['andheri-goregaon'])
      const parentOf = async (slug: string) => (await db.select({ parent: areas.parentSlug }).from(areas).where(eq(areas.slug, slug)))[0]!.parent
      expect(await parentOf('andheri-goregaon')).toBeNull()
      expect(await parentOf('andheri-west')).toBe('andheri-goregaon')
      expect(await parentOf('versova')).toBe('andheri-west')
    } finally {
      await testDb.drop()
      rmSync(folder, { recursive: true })
    }
  })
})
