import { eq, sql } from 'drizzle-orm'
import type { WaitlistPlace } from '@roomsie/contract'
import type { Db } from '../db/client'
import { waitlist } from '../db/schema'

/** The number of emails that one chat can add (T-22a). */
const entriesPerGoal = 3

/** Saves one entry of a chat. False: the chat has no entries left. */
export function joinWaitlist(db: Db, { email, place, goalId }: { email: string; place: WaitlistPlace; goalId: string }) {
  return db.transaction(async (tx) => {
    // Two joins of one chat at the same time must not both pass the count.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${goalId}, 0))`)
    // The limit comes first: a chat at the limit gives 429 for each email, also for one on the list.
    if (await tx.$count(waitlist, eq(waitlist.goalId, goalId)) >= entriesPerGoal) return false
    await tx.insert(waitlist).values({ email, place, goalId }).onConflictDoNothing()
    return true
  })
}
