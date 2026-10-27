import { and, eq, inArray } from 'drizzle-orm'
import { liveCardFields, cardResponse, type CardResponse, type ProfileResponse } from '@roomsie/contract'
import type { Db } from '../db/client'
import { profileLifestyle, profileMustHaves, profiles, users } from '../db/schema'
import { firstPhotoUrl, type Storage } from '../storage'
import { verifiedAmong } from '../verification/read'

export type Profile = typeof profiles.$inferSelect
type Answers = Pick<CardResponse, 'lifestyle' | 'mustHaves' | 'verified'>

export const missingFields = (p: Profile): ProfileResponse['missing'] =>
  liveCardFields.filter((f) => ({ whosMoving: p.whosMoving === 'unclear', areas: !p.areas.length, budget: p.budgetMin === null && p.budgetMax === null })[f])

/** Keys and values are text in the database, so the contract parses them. */
/** The answers and the Verified badge of each profile, in three queries. Gives a lookup by profile id. */
export async function answersFor(db: Db, profileIds: string[]) {
  const [lifestyle, mustHaves, people] = await Promise.all([
    db.select().from(profileLifestyle).where(inArray(profileLifestyle.profileId, profileIds)),
    db.select().from(profileMustHaves).where(inArray(profileMustHaves.profileId, profileIds)),
    // The card of a son or daughter shows no badge of the parent who sent the check.
    db.select({ id: profiles.id, userId: profiles.userId }).from(profiles).where(and(inArray(profiles.id, profileIds), eq(profiles.managedByParent, false))),
  ])
  const verifiedUsers = await verifiedAmong(db, people.map((p) => p.userId))
  const verified = new Set(people.filter((p) => verifiedUsers.has(p.userId)).map((p) => p.id))
  return (profileId: string): Answers => ({
    lifestyle: cardResponse.shape.lifestyle.parse(Object.fromEntries(lifestyle.filter((a) => a.profileId === profileId).map((a) => [a.axisKey, a.value]))),
    mustHaves: cardResponse.shape.mustHaves.parse(Object.fromEntries(mustHaves.filter((m) => m.profileId === profileId).map((m) => [m.mustHaveKey, m.weight]))),
    verified: verified.has(profileId),
  })
}

export const answersOf = async (db: Db, profileId: string) => (await answersFor(db, [profileId]))(profileId)

export function cardView(p: Profile, answers: Answers, storage: Storage): CardResponse {
  // The serializer parses the reply with the contract schema, which drops the fields that a card does not show.
  return { ...p, ...answers, photos: p.photoKeys.map((key) => ({ key, url: storage.publicUrl(key) })) }
}

export function profileView(p: Profile, answers: Answers, storage: Storage): ProfileResponse {
  return { ...cardView(p, answers, storage), gender: p.gender!, visibility: p.visibility, missing: missingFields(p), hiddenForReview: p.hiddenAt !== null }
}

/** The name, the first photo and the account status of people, by user id (T-44). A deleted account has no profile. */
export async function peopleOf(db: Db, storage: Storage, userIds: string[]) {
  const rows = await db.select({ userId: users.id, status: users.status, profile: profiles }).from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id)).where(inArray(users.id, userIds))
  return new Map(rows.map(({ userId, status, profile }) => [userId, {
    active: status === 'active', deleted: status === 'deleted',
    profileId: profile?.id ?? null, name: profile?.fullName ?? null, photoUrl: profile ? firstPhotoUrl(storage, profile.photoKeys) : null,
    managedByParent: profile?.managedByParent ?? false,
  }]))
}
