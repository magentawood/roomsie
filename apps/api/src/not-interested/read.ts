import { sql, type SQLWrapper } from 'drizzle-orm'
import type { Db, Tx } from '../db/client'
import { notInterested } from '../db/schema'

/**
 * A SQL condition: no "Not interested" between the two people, in either direction (PD17). Without it, the chat and the
 * requests of the two people leave the Messages of both.
 */
export const noNotInterestedBetween = (viewerUserId: string, otherUserId: SQLWrapper | string) => sql`not exists (
  select 1 from ${notInterested} n
  where (n.user_id = ${viewerUserId} and n.other_user_id = ${otherUserId})
     or (n.other_user_id = ${viewerUserId} and n.user_id = ${otherUserId})
)`

/** One of the two people picked "Not interested", so neither can send the other a request. */
export async function notInterestedBetween(db: Db | Tx, a: string, b: string) {
  const [row] = await db.execute<{ found: boolean }>(sql`select not ${noNotInterestedBetween(a, b)} as found`)
  return row!.found
}
