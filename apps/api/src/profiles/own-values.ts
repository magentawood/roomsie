import { eq } from 'drizzle-orm'
import type { OwnValues } from '@roomsie/contract'
import type { Tx } from '../db/client'
import { profiles } from '../db/schema'

/** What the person stated about themselves in the chat goes on the profile. The newer statement wins (PD3c, T-58). */
export async function saveOwnValues(tx: Tx, userId: string, { religion, community }: OwnValues) {
  if (!religion && !community) return
  await tx.update(profiles).set({ ...(religion && { religion }), ...(community && { community }), updatedAt: new Date() }).where(eq(profiles.userId, userId))
}
