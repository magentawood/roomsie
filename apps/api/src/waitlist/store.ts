import { and, count, eq } from 'drizzle-orm'
import { waitlistEntriesPerGoal, type WaitlistPlace } from '@roomsie/contract'
import type { Db } from '../db/client'
import { waitlist } from '../db/schema'

/** Saves one entry of a chat. The same email and place again change nothing. False: the chat has no entries left. */
export async function joinWaitlist(db: Db, entry: { email: string; area: WaitlistPlace; goalId: string }) {
  const [known] = await db.select({ id: waitlist.id }).from(waitlist).where(and(eq(waitlist.email, entry.email), eq(waitlist.area, entry.area)))
  if (known) return true
  const [row] = await db.select({ entries: count() }).from(waitlist).where(eq(waitlist.goalId, entry.goalId))
  if (row!.entries >= waitlistEntriesPerGoal) return false
  await db.insert(waitlist).values(entry).onConflictDoNothing()
  return true
}
