import { eq } from 'drizzle-orm'
import type { Tx } from '../db/client'
import { feedback } from '../db/schema'

/** The tombstone keeps the users row, so its cascade does not remove the feedback (PD19). */
export const deleteFeedbackOf = (tx: Tx, userId: string) => tx.delete(feedback).where(eq(feedback.userId, userId))
