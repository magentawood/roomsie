import { desc } from 'drizzle-orm'
import type { Db } from '../db/client'
import { modelSwitch } from '../db/schema'

const newestFirst = [desc(modelSwitch.createdAt), desc(modelSwitch.id)]

/** The Gemini switch of the admin (T-65). Each model call reads it, so a flip acts on the next call. */
export function modelSwitchOf(db: Db) {
  return {
    geminiOnly: async () => (await db.select({ on: modelSwitch.geminiOnly }).from(modelSwitch).orderBy(...newestFirst).limit(1))[0]?.on ?? false,
  }
}
export type ModelSwitch = ReturnType<typeof modelSwitchOf>

export const flipSwitch = (db: Db, userId: string, geminiOnly: boolean) => db.insert(modelSwitch).values({ geminiOnly, userId })

export const switchFlips = (db: Db, limit: number) =>
  db.select({ geminiOnly: modelSwitch.geminiOnly, userId: modelSwitch.userId, at: modelSwitch.createdAt }).from(modelSwitch).orderBy(...newestFirst).limit(limit)
