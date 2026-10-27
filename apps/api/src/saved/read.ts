import { desc, eq } from 'drizzle-orm'
import type { Db, Tx } from '../db/client'
import { saves } from '../db/schema'

/** The saved places and people of a user, newest first. */
export const savesOf = (db: Db, userId: string) =>
  db.select({ listingId: saves.listingId, profileId: saves.profileId }).from(saves).where(eq(saves.userId, userId)).orderBy(desc(saves.createdAt))

/** The tombstone keeps the users row, so its cascade does not remove the saves of the user (T-47). */
export const deleteSavesOf = (tx: Tx, userId: string) => tx.delete(saves).where(eq(saves.userId, userId))
