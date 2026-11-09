import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * The Supabase pooler cannot keep prepared statements between queries. It also drops a client connection that sits idle,
 * and a query on that dead socket waits for minutes. So the API closes an idle connection after 20 s, renews each one
 * every 5 minutes, and gives up a connect after 10 s.
 */
export const poolOptions = { prepare: false, idle_timeout: 20, max_lifetime: 5 * 60, connect_timeout: 10 } as const

export function createDb(url: string) {
  return drizzle(postgres(url, poolOptions), { schema })
}

export type Db = ReturnType<typeof createDb>
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
