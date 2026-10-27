import { and, eq, inArray, isNull, ne } from 'drizzle-orm'
import { liveCardFields, cardResponse, type CardResponse, type ProfileResponse } from '@roomsie/contract'
import { noBlockBetween } from '../blocks/read'
import type { Db, Tx } from '../db/client'
import { profileLifestyle, profileMustHaves, profiles } from '../db/schema'
import { firstPhotoUrl, type Storage } from '../storage'
import { activeAccount, statusesOf } from '../users'
import { verifiedIds } from '../verification/read'

export type Profile = typeof profiles.$inferSelect
type Answers = Pick<CardResponse, 'lifestyle' | 'mustHaves' | 'verified'>

export const missingFields = (p: Profile): ProfileResponse['missing'] =>
  liveCardFields.filter((f) => ({ whosMoving: p.whosMoving === 'unclear', areas: !p.areas.length, budget: p.budgetMin === null && p.budgetMax === null })[f])

/**
 * The people that a viewer can see: a live card of an active account that reports did not hide, so suspended and deleted people never appear.
 * With a viewer: not the viewer, and no block in either direction, because a block hides each person from the other.
 */
export function visiblePeople(viewerUserId?: string) {
  return [
    eq(profiles.visibility, 'live'),
    isNull(profiles.hiddenAt),
    activeAccount(profiles.userId),
    ...(viewerUserId ? [ne(profiles.userId, viewerUserId), noBlockBetween(viewerUserId, profiles.userId)] : []),
  ]
}

/** The cards of these profile ids that the viewer can see. */
export const visibleCards = (db: Db, viewerUserId: string, profileIds: string[]) =>
  db.select().from(profiles).where(and(inArray(profiles.id, profileIds), ...visiblePeople(viewerUserId)))

export const profilesByIds = (db: Db, profileIds: string[]) => db.select().from(profiles).where(inArray(profiles.id, profileIds))

/** A person has one profile at most. */
export const profilesOfUsers = (db: Db, userIds: string[]) => db.select().from(profiles).where(inArray(profiles.userId, userIds))

export const profileOf = async (db: Db, userId: string): Promise<Profile | undefined> => (await profilesOfUsers(db, [userId]))[0]

/** The user of a profile that is not the viewer's own, in each state of the card. A caller can add `.for('update')`. */
export const ownerOfProfile = (db: Db | Tx, profileId: string, viewerUserId: string) =>
  db.select({ userId: profiles.userId }).from(profiles).where(and(eq(profiles.id, profileId), ne(profiles.userId, viewerUserId)))

/** Keys and values are text in the database, so the contract parses them. */
/** The answers and the Verified badge of each profile. Gives a lookup by profile id. */
export async function answersFor(db: Db, profileIds: string[]) {
  const [lifestyle, mustHaves, people] = await Promise.all([
    db.select().from(profileLifestyle).where(inArray(profileLifestyle.profileId, profileIds)),
    db.select().from(profileMustHaves).where(inArray(profileMustHaves.profileId, profileIds)),
    // The card of a son or daughter shows no badge of the parent who sent the check.
    db.select({ id: profiles.id, userId: profiles.userId }).from(profiles).where(and(inArray(profiles.id, profileIds), eq(profiles.managedByParent, false))),
  ])
  const verified = await verifiedIds(db, people)
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
  const [statuses, rows] = await Promise.all([statusesOf(db, userIds), profilesOfUsers(db, userIds)])
  const profileOfUser = new Map(rows.map((p) => [p.userId, p]))
  return new Map([...statuses].map(([userId, status]) => {
    const profile = profileOfUser.get(userId)
    return [userId, {
      active: status === 'active', deleted: status === 'deleted',
      profileId: profile?.id ?? null, name: profile?.fullName ?? null, photoUrl: profile ? firstPhotoUrl(storage, profile.photoKeys) : null,
      managedByParent: profile?.managedByParent ?? false,
    }]
  }))
}

/** A report or a moderator hides a card for review (T-19); a dismiss shows it again. */
export const setCardHiddenForReview = (tx: Tx, userId: string, hiddenAt: Date | null) => tx.update(profiles).set({ hiddenAt }).where(eq(profiles.userId, userId))

/** Hides the card for review, unless it is hidden already: the first hide keeps its time. */
export const hideCardForReview = (tx: Tx, profileId: string) =>
  tx.update(profiles).set({ hiddenAt: new Date() }).where(and(eq(profiles.id, profileId), isNull(profiles.hiddenAt)))

/* At an account deletion (T-20). */
export const unpublishCardOf = (db: Db, userId: string) => db.update(profiles).set({ visibility: 'hidden', updatedAt: new Date() }).where(eq(profiles.userId, userId))
export const profilePhotoKeysOf = async (tx: Tx, userId: string) =>
  (await tx.select({ keys: profiles.photoKeys }).from(profiles).where(eq(profiles.userId, userId))).flatMap((r) => r.keys)
export const deleteProfileOf = (tx: Tx, userId: string) => tx.delete(profiles).where(eq(profiles.userId, userId))
