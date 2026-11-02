import { eq } from 'drizzle-orm'
import type { OwnValues } from '@roomsie/contract'
import type { Tx } from '../db/client'
import { profiles } from '../db/schema'

/** What the person stated about themselves in the chat goes on the profile. The newer statement wins (PD3c, T-58). */
export async function stateOwnValues(tx: Tx, userId: string, own: OwnValues) {
  const stated = Object.fromEntries(Object.entries(own).filter(([, value]) => value !== null))
  if (Object.keys(stated).length) await tx.update(profiles).set({ ...stated, updatedAt: new Date() }).where(eq(profiles.userId, userId))
}
