import { desc } from 'drizzle-orm'
import type { Db } from '../db/client'
import { modelSwitch } from '../db/schema'
import { emailsOf } from '../users'

const flips = (db: Db, limit?: number) => {
  const query = db.select({ geminiOnly: modelSwitch.geminiOnly, userId: modelSwitch.userId, at: modelSwitch.createdAt })
    .from(modelSwitch).orderBy(desc(modelSwitch.createdAt), desc(modelSwitch.id))
  return limit ? query.limit(limit) : query
}

/** The Gemini switch of the admin (T-65): the newest flip is the state, and no flip is off. Each model call reads it. */
export const geminiOnly = async (db: Db) => (await flips(db, 1))[0]?.geminiOnly ?? false

export const flipSwitch = (db: Db, userId: string, on: boolean) => db.insert(modelSwitch).values({ geminiOnly: on, userId })

/** The flips, newest first, with the sign-in email of each person. */
export async function switchLog(db: Db, limit?: number) {
  const rows = await flips(db, limit)
  const emails = await emailsOf(db, rows.flatMap((r) => (r.userId ? [r.userId] : [])))
  return rows.map((r) => ({ geminiOnly: r.geminiOnly, at: r.at.toISOString(), by: (r.userId && emails.get(r.userId)) ?? null }))
}

export async function switchState(db: Db) {
  const [newest] = await switchLog(db, 1)
  return { geminiOnly: newest?.geminiOnly ?? false, since: newest?.at ?? null, by: newest?.by ?? null }
}
