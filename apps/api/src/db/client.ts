import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * The Supabase pooler in transaction mode cannot keep prepared statements between queries, and it cannot take pipelined
 * queries: postgres.js sends up to 100 queries on a busy connection, the pooler hands them to different database sessions,
 * and a session waits for the rest of a query that never comes, so requests hang under load (2026-11-09). One query at a
 * time on each connection. An idle connection closes after 20 s, each one is renewed every 5 minutes, and a connect gives up after 10 s.
 */
export const poolOptions = { prepare: false, max_pipeline: 1, idle_timeout: 20, max_lifetime: 5 * 60, connect_timeout: 10 } as const

export function createDb(url: string) {
  return drizzle(postgres(url, poolOptions), { schema })
}

export type Db = ReturnType<typeof createDb>
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
