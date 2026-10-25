import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { Db } from './client'
import { seedCatalogues } from './seed-axes'

export async function migrateAndSeed(db: Db, migrationsFolder: string) {
  await migrate(db, { migrationsFolder })
  await seedCatalogues(db)
}
