import { and, count, eq, sql } from 'drizzle-orm'
import { waitlistEntriesPerGoal, type WaitlistPlace } from '@roomsie/contract'
import type { Db } from '../db/client'
import { waitlist } from '../db/schema'

/** Saves one entry of a chat. The same email and place again change nothing. False: the chat has no entries left. */
export function joinWaitlist(db: Db, { email, place, goalId }: { email: string; place: WaitlistPlace; goalId: string }) {
  return db.transaction(async (tx) => {
    // Two joins of one chat at the same time must not both pass the count.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${goalId}, 0))`)
    const [known] = await tx.select({ id: waitlist.id }).from(waitlist).where(and(eq(waitlist.email, email), eq(waitlist.area, place)))
    if (known) return true
    const [row] = await tx.select({ entries: count() }).from(waitlist).where(eq(waitlist.goalId, goalId))
    if (row!.entries >= waitlistEntriesPerGoal) return false
    await tx.insert(waitlist).values({ email, area: place, goalId }).onConflictDoNothing()
    return true
  })
}
