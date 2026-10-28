import { desc, eq, sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { inviteGate, invites } from '../db/schema'

/** The newest row of the gate. With no row, the gate is closed and has no opening time. */
export async function currentGate(db: Db) {
  const [row] = await db.select({
    inviteOnly: inviteGate.inviteOnly,
    opensAt: inviteGate.opensAt,
    closed: sql<boolean>`${inviteGate.inviteOnly} and (${inviteGate.opensAt} is null or ${inviteGate.opensAt} > now())`,
  }).from(inviteGate).orderBy(desc(inviteGate.createdAt)).limit(1)
  return row ?? { inviteOnly: true, opensAt: null, closed: true }
}

/** Null when the gate lets this verified email in. Else the opening time, for the screen of the refused person (T-33). */
export async function refusal(db: Db, email: string | null) {
  const gate = await currentGate(db)
  if (!gate.closed) return null
  const invited = email && (await db.select({ id: invites.id }).from(invites).where(eq(invites.email, email.toLowerCase()))).length > 0
  return invited ? null : { opensAt: gate.opensAt }
}
