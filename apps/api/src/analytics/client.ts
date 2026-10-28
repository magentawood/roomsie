import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/** The analytics database is a second Supabase project, behind its own transaction pooler (ADR-0012). */
export function createAnalyticsDb(url: string) {
  return drizzle(postgres(url, { prepare: false }), { schema })
}

export type AnalyticsDb = ReturnType<typeof createAnalyticsDb>
