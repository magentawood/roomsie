import { count, eq, gte } from 'drizzle-orm'
import { noFaces, type GoalFeedbackBody } from '@roomsie/contract'
import type { Db, Tx } from '../db/client'
import { feedback } from '../db/schema'
import { weekBefore } from '../today'

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

export async function feedbackOfWeek(db: Db, now: Date) {
  const rows = await db.select({ rating: feedback.rating, n: count() }).from(feedback).where(gte(feedback.createdAt, weekBefore(now))).groupBy(feedback.rating)
  const faces = { ...noFaces }
  for (const { rating, n } of rows) if (rating) faces[rating] = n
  return { total: rows.reduce((sum, r) => sum + r.n, 0), faces }
}
