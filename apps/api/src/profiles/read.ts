import { eq } from 'drizzle-orm'
import { liveCardFields, cardResponse, type CardResponse, type ProfileResponse } from '@roomsie/contract'
import type { Db } from '../db/client'
import { profileLifestyle, profileMustHaves, profiles } from '../db/schema'
import type { Storage } from '../storage'

export type Profile = typeof profiles.$inferSelect
type Answers = Pick<CardResponse, 'lifestyle' | 'mustHaves'>

export const missingFields = (p: Profile): ProfileResponse['missing'] =>
  liveCardFields.filter((f) => ({ whosMoving: p.whosMoving === 'unclear', areas: !p.areas.length, budget: p.budgetMax === null })[f])

/** Keys and values are text in the database, so the contract parses them. */
export async function answersOf(db: Db, profileId: string): Promise<Answers> {
  const [lifestyle, mustHaves] = await Promise.all([
    db.select().from(profileLifestyle).where(eq(profileLifestyle.profileId, profileId)),
    db.select().from(profileMustHaves).where(eq(profileMustHaves.profileId, profileId)),
  ])
  return {
    lifestyle: cardResponse.shape.lifestyle.parse(Object.fromEntries(lifestyle.map((a) => [a.axisKey, a.value]))),
    mustHaves: cardResponse.shape.mustHaves.parse(Object.fromEntries(mustHaves.map((m) => [m.mustHaveKey, m.weight]))),
  }
}

export function cardView(p: Profile, answers: Answers, storage: Storage): CardResponse {
  // The serializer parses the reply with the contract schema, which drops the fields that a card does not show.
  return { ...p, ...answers, photos: p.photoKeys.map((key) => ({ key, url: storage.publicUrl(key) })) }
}

export function profileView(p: Profile, answers: Answers, storage: Storage): ProfileResponse {
  return { ...cardView(p, answers, storage), gender: p.gender!, visibility: p.visibility, missing: missingFields(p) }
}
