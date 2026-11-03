import { eq } from 'drizzle-orm'
import type { GoalFeedbackBody } from '@roomsie/contract'
import type { Db, Tx } from '../db/client'
import { feedback } from '../db/schema'

/**
 * The landing feedback of the person: the tombstone keeps the users row, so its cascade does not remove it (PD19).
 * The feedback of a goal goes with its goal.
 */
export const deleteFeedbackOf = (tx: Tx, userId: string) => tx.delete(feedback).where(eq(feedback.userId, userId))

export const hasGoalFeedback = async (db: Db, goalId: string) =>
  (await db.select({ id: feedback.id }).from(feedback).where(eq(feedback.goalId, goalId))).length > 0

/** The feedback of a closed goal, which its goal owns (T-50). False: the goal has its feedback already. */
export async function saveGoalFeedback(db: Db, goalId: string, { rating, text }: GoalFeedbackBody) {
  const [saved] = await db.insert(feedback).values({ goalId, rating, text }).onConflictDoNothing({ target: feedback.goalId }).returning({ id: feedback.id })
  return Boolean(saved)
}
