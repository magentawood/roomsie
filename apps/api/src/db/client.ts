import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * The API connects through the session pooler of Supabase (ADR-0018). The transaction pooler hung each query with values:
 * postgres.js asks the database to describe it, flushes, and waits, and the pooler did not always pass the answer back (2026-11-09).
 * In session mode each connection of the API holds one database connection, so a pool has 6: an old and a new API fit in the
 * pooler during a deploy. Prepared statements stay off, so the code also works on the transaction pooler.
 * An idle connection closes after 20 s, each one is renewed every 5 minutes, and a connect gives up after 10 s.
 */
export const poolOptions = { prepare: false, max: 6, idle_timeout: 20, max_lifetime: 5 * 60, connect_timeout: 10 } as const

export function createDb(url: string) {
  return drizzle(postgres(url, poolOptions), { schema })
}

export type Db = ReturnType<typeof createDb>
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
