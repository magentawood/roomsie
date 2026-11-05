import { desc, sql } from 'drizzle-orm'
import type { Db, Tx } from '../db/client'
import { modelSwitch } from '../db/schema'
import { emailsOf } from '../users'

const flips = (db: Db | Tx, limit: number) => db.select({ geminiOnly: modelSwitch.geminiOnly, savedBy: modelSwitch.savedBy, at: modelSwitch.createdAt })
  .from(modelSwitch).orderBy(desc(modelSwitch.createdAt)).limit(limit)

export const geminiOnly = async (db: Db | Tx) => (await flips(db, 1))[0]?.geminiOnly ?? false

/** A flip to the state of now adds no row. The lock stops two flips at the same time. True: the state changed. */
export const flipSwitch = (db: Db, userId: string, on: boolean) => db.transaction(async (tx) => {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('model_switch'))`)
  if ((await geminiOnly(tx)) === on) return false
  // The time after the lock, not of the start of the transaction, so the order of the rows is the order of the lock.
  await tx.insert(modelSwitch).values({ geminiOnly: on, savedBy: userId, createdAt: sql`clock_timestamp()` })
  return true
})

/** The newest flips, with the sign-in email of each person. */
export async function switchLog(db: Db, limit = 100) {
  const rows = await flips(db, limit)
  const emails = await emailsOf(db, rows.flatMap((r) => (r.savedBy ? [r.savedBy] : [])))
  return rows.map((r) => ({ geminiOnly: r.geminiOnly, at: r.at.toISOString(), by: (r.savedBy && emails.get(r.savedBy)) ?? null }))
}

export async function switchState(db: Db) {
  const [newest] = await switchLog(db, 1)
  return { geminiOnly: newest?.geminiOnly ?? false, since: newest?.at ?? null, by: newest?.by ?? null }
}
