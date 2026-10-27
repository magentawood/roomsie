import { eq } from 'drizzle-orm'
import type { Tx } from '../db/client'
import { pushTokens } from '../db/schema'

export const deletePushTokensOf = (tx: Tx, userId: string) => tx.delete(pushTokens).where(eq(pushTokens.userId, userId))
