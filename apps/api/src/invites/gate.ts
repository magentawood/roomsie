import { sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { inviteGate, invites } from '../db/schema'

/** Null when the gate lets this verified email in. Else the opening time, for the screen of the refused person (T-33). */
export async function refusal(db: Db, email: string | null) {
  const [gate] = await db.select({
    closed: sql<boolean>`${inviteGate.inviteOnly} and (${inviteGate.opensAt} is null or ${inviteGate.opensAt} > now())`,
    opensAt: inviteGate.opensAt,
    invited: email ? sql<boolean>`exists (select 1 from ${invites} where ${invites.email} = ${email.toLowerCase()})` : sql<boolean>`false`,
  }).from(inviteGate)
  return gate?.closed && !gate.invited ? { opensAt: gate.opensAt } : null
}
