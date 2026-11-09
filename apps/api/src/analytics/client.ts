import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { poolOptions } from '../db/client'

/** The analytics database is a second Supabase project, behind its own session pooler (ADR-0012, ADR-0018), with the same pool. */
export function createAnalyticsDb(url: string) {
  return drizzle(postgres(url, poolOptions))
}

export type AnalyticsDb = ReturnType<typeof createAnalyticsDb>
