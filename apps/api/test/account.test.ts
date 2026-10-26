import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq, inArray } from 'drizzle-orm'
import { meResponse } from '@roomsie/contract'
import { createTestDb, type TestDb } from './db'
import { projectId, testTokens } from './tokens'
import { tombstoneKey } from '../src/account'
import {
  anonymousSessions, areas, blocks, chatTurns, connectionRequests, goals, listingFlatmates, listingRates, listings, profiles, reports, saves, users,
} from '../src/db/schema'
import { buildServer } from '../src/server'
import { offlineStorage } from '../scripts/openapi'
import type { Storage } from '../src/storage'

let testDb: TestDb
let app: ReturnType<typeof buildServer>
let idToken: Awaited<ReturnType<typeof testTokens>>['idToken']

/** Records each delete. Set `down` to make R2 fail. */
const photos = { deleted: [] as string[], down: false }
const fakeStore: Storage = {
  ...offlineStorage,
  async deleteObjects(keys) {
    if (photos.down) throw new Error('R2 is down')
    photos.deleted.push(...keys)
  },
}

beforeAll(async () => {
  testDb = await createTestDb()
  await testDb.db.insert(areas).values({ slug: 'powai', name: 'Powai' })
  const tokens = await testTokens()
  idToken = tokens.idToken
  app = buildServer({ webOrigin: 'http://localhost:3000', db: testDb.db, firebaseProjectId: projectId, firebaseKeys: tokens.firebaseKeys, storage: fakeStore })
})
afterAll(async () => {
  await app.close()
  await testDb.drop()
})
beforeEach(() => {
  photos.deleted = []
  photos.down = false
})

const call = (method: 'GET' | 'DELETE', token: string) =>
  app.inject({ method, url: '/v1/me', headers: { authorization: `Bearer ${token}` } })

/** Signs in a minute ago, so the session is from before the deletion. */
async function signIn(uid: string) {
  const token = await idToken(uid, { authTime: Math.floor(Date.now() / 1000) - 60 })
  return { uid, token, id: meResponse.parse((await call('GET', token)).json()).id }
}

/** A sign-in right now, after the deletion. auth_time is in whole seconds, like Firebase's. */
const freshToken = (uid: string) => idToken(uid, { authTime: Math.floor(Date.now() / 1000) })

/** A person with something in each table that deletion must empty. */
async function seedAccount(userId: string, tag: string) {
  const db = testDb.db
  const [profile] = await db.insert(profiles)
    .values({ userId, fullName: `Person ${tag}`, age: 25, photoKeys: [`p/${tag}-1`, `p/${tag}-2`], visibility: 'live' }).returning()
  const [listing] = await db.insert(listings).values({
    ownerUserId: userId, kind: 'room_in_flat', status: 'live', areaSlug: 'powai',
    expiresAt: new Date(Date.now() + 86_400_000), photoKeys: [`l/${tag}`],
  }).returning()
  await db.insert(listingRates).values({ listingId: listing!.id, listingKind: 'room_in_flat', rent: 20000 })
  await db.insert(listingFlatmates).values({ listingId: listing!.id, listingKind: 'room_in_flat', name: 'Asha', photoKey: `f/${tag}` })
  const [goal] = await db.insert(goals).values({ userId, form: { intent: 'room' } }).returning()
  await db.insert(chatTurns).values({ goalId: goal!.id, role: 'user', inputMethod: 'typed', text: 'I work in Powai' })
  const [session] = await db.insert(anonymousSessions)
    .values({ deviceHash: `device-${tag}`, claimedByUserId: userId, expiresAt: new Date(Date.now() + 86_400_000) }).returning()
  const [sessionGoal] = await db.insert(goals).values({ anonymousSessionId: session!.id }).returning()
  return { profile: profile!, listingId: listing!.id, goalIds: [goal!.id, sessionGoal!.id] }
}

const userRow = async (id: string) => (await testDb.db.select().from(users).where(eq(users.id, id)))[0]!

describe('DELETE /v1/me', () => {
  it('removes the data of the account, its photos and its sessions', async () => {
    const gone = await signIn('uid-delete')
    const stays = await signIn('uid-stays')
    const goneSeed = await seedAccount(gone.id, 'gone')
    const staysSeed = await seedAccount(stays.id, 'stays')
    const db = testDb.db
    await db.insert(connectionRequests).values({ fromProfileId: staysSeed.profile.id, toProfileId: goneSeed.profile.id })
    await db.insert(reports).values({ reporterUserId: gone.id, subjectUserId: stays.id, reason: 'spam' })
    await db.insert(blocks).values({ blockerUserId: gone.id, blockedUserId: stays.id })
    // Each saved the other's place and card (T-47).
    await db.insert(saves).values([
      { userId: gone.id, listingId: staysSeed.listingId }, { userId: gone.id, profileId: staysSeed.profile.id },
      { userId: stays.id, listingId: goneSeed.listingId }, { userId: stays.id, profileId: goneSeed.profile.id },
    ])

    expect((await call('DELETE', gone.token)).statusCode).toBe(204)

    expect(photos.deleted.sort()).toEqual(['f/gone', 'l/gone', 'p/gone-1', 'p/gone-2'])
    expect(await db.select().from(profiles).where(eq(profiles.userId, gone.id))).toHaveLength(0)
    expect(await db.select().from(listings).where(eq(listings.ownerUserId, gone.id))).toHaveLength(0)
    expect(await db.select().from(goals).where(inArray(goals.id, goneSeed.goalIds))).toHaveLength(0)
    expect(await db.select().from(chatTurns).where(inArray(chatTurns.goalId, goneSeed.goalIds))).toHaveLength(0)
    expect(await db.select().from(listingRates).where(eq(listingRates.listingId, goneSeed.listingId))).toHaveLength(0)
    expect(await db.select().from(listingFlatmates).where(eq(listingFlatmates.listingId, goneSeed.listingId))).toHaveLength(0)
    expect(await db.select().from(anonymousSessions).where(eq(anonymousSessions.claimedByUserId, gone.id))).toHaveLength(0)
    expect(await db.select().from(connectionRequests).where(eq(connectionRequests.toProfileId, goneSeed.profile.id))).toHaveLength(0)
    expect(await db.select().from(saves).where(eq(saves.userId, gone.id))).toHaveLength(0)
    expect(await db.select().from(saves).where(eq(saves.userId, stays.id))).toHaveLength(0)
    // The other person keeps all of theirs.
    expect(await db.select().from(goals).where(inArray(goals.id, staysSeed.goalIds))).toHaveLength(2)
    expect(await db.select().from(chatTurns).where(inArray(chatTurns.goalId, staysSeed.goalIds))).toHaveLength(1)
    expect(await db.select().from(listingRates).where(eq(listingRates.listingId, staysSeed.listingId))).toHaveLength(1)
    expect(await db.select().from(profiles).where(eq(profiles.userId, stays.id))).toHaveLength(1)
    // Reports and blocks stay for moderation.
    expect(await db.select().from(reports).where(eq(reports.reporterUserId, gone.id))).toHaveLength(1)
    expect(await db.select().from(blocks).where(eq(blocks.blockerUserId, gone.id))).toHaveLength(1)

    // The tombstone keeps only a hash of the uid.
    const tombstone = await userRow(gone.id)
    expect(tombstone).toMatchObject({ status: 'deleted', authProviderId: tombstoneKey(gone.uid), rejoinBlocked: false })
    expect(tombstone.tokensValidAfter.getMilliseconds()).toBe(0)

    // tokens_valid_after moved, so the old session ends.
    expect((await call('GET', gone.token)).statusCode).toBe(401)
    expect((await call('DELETE', gone.token)).statusCode).toBe(401)
  })

  it('makes a new, empty account at a sign-in after the deletion, also in the same second', async () => {
    const old = await signIn('uid-comes-back')
    expect((await call('DELETE', old.token)).statusCode).toBe(204)

    const res = await call('GET', await freshToken(old.uid))
    expect(res.statusCode).toBe(200)
    const body = meResponse.parse(res.json())
    expect(body.status).toBe('active')
    expect(body.id).not.toBe(old.id)

    // The tombstone lets go of the uid hash, so the old id never comes back.
    expect(await userRow(old.id)).toMatchObject({ status: 'deleted', authProviderId: `deleted:${old.id}` })
    expect((await call('GET', old.token)).statusCode).toBe(401)
  })

  it('moves each block against the old account to the new account', async () => {
    const old = await signIn('uid-blocked-then-rejoins')
    const blocker = await signIn('uid-blocker')
    await testDb.db.insert(blocks).values({ blockerUserId: blocker.id, blockedUserId: old.id })
    expect((await call('DELETE', old.token)).statusCode).toBe(204)

    const fresh = meResponse.parse((await call('GET', await freshToken(old.uid))).json())
    const moved = await testDb.db.select().from(blocks).where(eq(blocks.blockedUserId, fresh.id))
    expect(moved).toMatchObject([{ blockerUserId: blocker.id }])
  })

  it('lets a suspended person delete, and stops a new sign-in with the same account', async () => {
    const user = await signIn('uid-suspended-deletes')
    await seedAccount(user.id, 'suspended')
    await testDb.db.update(users).set({ status: 'suspended' }).where(eq(users.id, user.id))
    expect((await call('GET', user.token)).statusCode).toBe(403)

    expect((await call('DELETE', user.token)).statusCode).toBe(204)
    expect(await testDb.db.select().from(profiles).where(eq(profiles.userId, user.id))).toHaveLength(0)
    expect(await userRow(user.id)).toMatchObject({ status: 'deleted', rejoinBlocked: true })

    expect((await call('GET', await freshToken(user.uid))).statusCode).toBe(403)
    expect(await testDb.db.select().from(users).where(eq(users.authProviderId, user.uid))).toHaveLength(0)
  })

  it('knows a returning person by the Google account id, so a new Firebase uid after T-53 still meets the checks', async () => {
    const before = await idToken('uid-before-t53', { authTime: Math.floor(Date.now() / 1000) - 60, googleId: 'google-1' })
    const { id } = meResponse.parse((await call('GET', before)).json())
    await testDb.db.update(users).set({ status: 'suspended' }).where(eq(users.id, id))
    expect((await call('DELETE', before)).statusCode).toBe(204)
    expect(await userRow(id)).toMatchObject({ authProviderId: tombstoneKey('google-1'), rejoinBlocked: true })

    // T-53 deletes the Firebase user, so the next Google sign-in has a new uid.
    const after = await idToken('uid-after-t53', { authTime: Math.floor(Date.now() / 1000), googleId: 'google-1' })
    expect((await call('GET', after)).statusCode).toBe(403)
  })

  it('makes one tombstone from two deletes at the same time, so a suspended person stays out', async () => {
    const user = await signIn('uid-double-tap')
    await testDb.db.update(users).set({ status: 'suspended' }).where(eq(users.id, user.id))

    // The second request waits on the lock of the first, or arrives after the deletion and gets 401.
    const replies = await Promise.all([call('DELETE', user.token), call('DELETE', user.token)])
    expect(replies.map((r) => r.statusCode)).toContain(204)
    for (const r of replies) expect([204, 401]).toContain(r.statusCode)
    expect(await userRow(user.id)).toMatchObject({ status: 'deleted', authProviderId: tombstoneKey(user.uid), rejoinBlocked: true })
    expect((await call('GET', await freshToken(user.uid))).statusCode).toBe(403)
  })

  it('stops a new sign-in while a report against the old account is open', async () => {
    const user = await signIn('uid-reported')
    const reporter = await signIn('uid-reporter')
    const [report] = await testDb.db.insert(reports).values({ reporterUserId: reporter.id, subjectUserId: user.id, reason: 'harassment' }).returning()
    expect((await call('DELETE', user.token)).statusCode).toBe(204)

    expect((await call('GET', await freshToken(user.uid))).statusCode).toBe(403)
    // The moderator dismisses the report: then the person can come back.
    await testDb.db.update(reports).set({ status: 'dismissed' }).where(eq(reports.id, report!.id))
    expect((await call('GET', await freshToken(user.uid))).statusCode).toBe(200)
  })

  it('hides the card and removes no data when the photos cannot be deleted, thus a retry is safe', async () => {
    const user = await signIn('uid-r2-down')
    const seed = await seedAccount(user.id, 'r2-down')
    photos.down = true
    expect((await call('DELETE', user.token)).statusCode).toBe(500)

    const [profile] = await testDb.db.select().from(profiles).where(eq(profiles.userId, user.id))
    expect(profile!.visibility).toBe('hidden')
    const [listing] = await testDb.db.select().from(listings).where(eq(listings.id, seed.listingId))
    expect(listing!.status).toBe('inactive')
    expect((await call('GET', user.token)).statusCode).toBe(200)

    photos.down = false
    expect((await call('DELETE', user.token)).statusCode).toBe(204)
    expect(await testDb.db.select().from(profiles).where(eq(profiles.userId, user.id))).toHaveLength(0)
  })

  it('deletes an account with no data', async () => {
    const user = await signIn('uid-empty')
    expect((await call('DELETE', user.token)).statusCode).toBe(204)
    expect(photos.deleted).toEqual([])
  })

  it('rejects a request with no token', async () => {
    expect((await app.inject({ method: 'DELETE', url: '/v1/me' })).statusCode).toBe(401)
  })
})
