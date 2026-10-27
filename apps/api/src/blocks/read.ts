import { eq, sql, type SQLWrapper } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { Tx } from '../db/client'
import { blocks } from '../db/schema'

/** A SQL condition: no block in either direction, because a block hides each person from the other. */
export const noBlockBetween = (viewerUserId: string, otherUserId: SQLWrapper) => sql`not exists (
  select 1 from ${blocks} b
  where (b.blocker_user_id = ${viewerUserId} and b.blocked_user_id = ${otherUserId})
     or (b.blocked_user_id = ${viewerUserId} and b.blocker_user_id = ${otherUserId})
)`

/** At a rejoin: each block against the old account also blocks the new one. */
export async function copyBlocksAgainst(tx: Tx, oldUserId: string, newUserId: string) {
  const blockers = await tx.select({ blockerUserId: blocks.blockerUserId }).from(blocks).where(eq(blocks.blockedUserId, oldUserId))
  if (blockers.length > 0) {
    await tx.insert(blocks).values(blockers.map((b) => ({ id: uuidv7(), blockerUserId: b.blockerUserId, blockedUserId: newUserId })))
      .onConflictDoNothing()
  }
}
