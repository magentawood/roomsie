import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export function createDb(url: string) {
  // The Supabase transaction pooler cannot keep prepared statements between queries.
  return drizzle(postgres(url, { prepare: false }), { schema })
}

export type Db = ReturnType<typeof createDb>
