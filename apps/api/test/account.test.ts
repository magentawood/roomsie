import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq, inArray } from 'drizzle-orm'
import { meResponse } from '@roomsie/contract'
import { createTestDb, type TestDb } from './db'
import { projectId, testTokens } from './tokens'
import {
  anonymousSessions, blocks, chatTurns, connectionRequests, goals, listingFlatmates, listingRates, listings, profiles, reports, users,
} from '../src/db/schema'
import { buildServer } from '../src/server'
import type { PhotoStore } from '../src/storage'

let testDb: TestDb
let app: ReturnType<typeof buildServer>
let idToken: Awaited<ReturnType<typeof testTokens>>['idToken']

/** Records each delete. Set `down` to make R2 fail. */
const photos = { deleted: [] as string[], down: false }
const fakeStore: PhotoStore = {
  async deleteObjects(keys) {
    if (photos.down) throw new Error('R2 is down')
    photos.deleted.push(...keys)
  },
}

beforeAll(async () => {
  testDb = await createTestDb()
  const tokens = await testTokens()
  idToken = tokens.idToken
  app = buildServer({ webOrigin: 'http://localhost:3000', db: testDb.db, firebaseProjectId: projectId, firebaseKeys: tokens.firebaseKeys, photos: fakeStore })
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

/** Signs in a minute ago, so a token from after the deletion is a fresh sign-in. */
async function signIn(uid: string) {
  const token = await idToken(uid, { authTime: Math.floor(Date.now() / 1000) - 60 })
  return { token, id: meResponse.parse((await call('GET', token)).json()).id }
}

/** A person with something in each table that deletion must empty. */
async function seedAccount(userId: string, tag: string) {
  const db = testDb.db
  const [profile] = await db.insert(profiles).values({ userId, fullName: `Person ${tag}`, age: 25, photoKeys: [`p/${tag}-1`, `p/${tag}-2`] }).returning()
  const [listing] = await db.insert(listings).values({ ownerUserId: userId, kind: 'room_in_flat', photoKeys: [`l/${tag}`] }).returning()
  await db.insert(listingRates).values({ listingId: listing!.id, listingKind: 'room_in_flat', rent: 20000 })
  await db.insert(listingFlatmates).values({ listingId: listing!.id, listingKind: 'room_in_flat', name: 'Asha', photoKey: `f/${tag}` })
  const [goal] = await db.insert(goals).values({ userId, form: { intent: 'room' } }).returning()
  await db.insert(chatTurns).values({ goalId: goal!.id, role: 'user', inputMethod: 'typed', text: 'I work in Powai' })
  const [session] = await db.insert(anonymousSessions)
    .values({ deviceHash: `device-${tag}`, claimedByUserId: userId, expiresAt: new Date(Date.now() + 86_400_000) }).returning()
  const [sessionGoal] = await db.insert(goals).values({ anonymousSessionId: session!.id }).returning()
  return { profile: profile!, listingId: listing!.id, goalIds: [goal!.id, sessionGoal!.id] }
}

describe('DELETE /v1/me', () => {
  it('removes the data of the account, its photos and its sessions', async () => {
    const gone = await signIn('uid-delete')
    const stays = await signIn('uid-stays')
    const goneProfile = await seedAccount(gone.id, 'gone')
    const staysProfile = await seedAccount(stays.id, 'stays')
    const db = testDb.db
    await db.insert(connectionRequests).values({ fromProfileId: staysProfile.profile.id, toProfileId: goneProfile.profile.id })
    await db.insert(reports).values({ reporterUserId: stays.id, subjectUserId: gone.id, reason: 'spam' })
    await db.insert(blocks).values({ blockerUserId: gone.id, blockedUserId: stays.id })

    expect((await call('DELETE', gone.token)).statusCode).toBe(204)

    expect(photos.deleted.sort()).toEqual(['f/gone', 'l/gone', 'p/gone-1', 'p/gone-2'])
    expect(await db.select().from(profiles).where(eq(profiles.userId, gone.id))).toHaveLength(0)
    expect(await db.select().from(listings).where(eq(listings.ownerUserId, gone.id))).toHaveLength(0)
    expect(await db.select().from(goals).where(inArray(goals.id, goneProfile.goalIds))).toHaveLength(0)
    expect(await db.select().from(chatTurns).where(inArray(chatTurns.goalId, goneProfile.goalIds))).toHaveLength(0)
    expect(await db.select().from(listingRates).where(eq(listingRates.listingId, goneProfile.listingId))).toHaveLength(0)
    expect(await db.select().from(listingFlatmates).where(eq(listingFlatmates.listingId, goneProfile.listingId))).toHaveLength(0)
    expect(await db.select().from(anonymousSessions).where(eq(anonymousSessions.claimedByUserId, gone.id))).toHaveLength(0)
    expect(await db.select().from(connectionRequests).where(eq(connectionRequests.toProfileId, goneProfile.profile.id))).toHaveLength(0)
    // The other person keeps all of theirs.
    expect(await db.select().from(goals).where(inArray(goals.id, staysProfile.goalIds))).toHaveLength(2)
    expect(await db.select().from(chatTurns).where(inArray(chatTurns.goalId, staysProfile.goalIds))).toHaveLength(1)
    expect(await db.select().from(listingRates).where(eq(listingRates.listingId, staysProfile.listingId))).toHaveLength(1)

    const [tombstone] = await db.select().from(users).where(eq(users.id, gone.id))
    expect(tombstone!.status).toBe('deleted')
    expect(await db.select().from(reports).where(eq(reports.subjectUserId, gone.id))).toHaveLength(1)
    expect(await db.select().from(blocks).where(eq(blocks.blockerUserId, gone.id))).toHaveLength(1)
    expect(await db.select().from(profiles).where(eq(profiles.userId, stays.id))).toHaveLength(1)

    // tokens_valid_after moved, so the old session ends.
    expect((await call('GET', gone.token)).statusCode).toBe(401)
    expect((await call('DELETE', gone.token)).statusCode).toBe(401)
  })

  it('makes a new, empty account at a fresh sign-in after the deletion', async () => {
    const old = await signIn('uid-comes-back')
    expect((await call('DELETE', old.token)).statusCode).toBe(204)

    const fresh = await idToken('uid-comes-back', { authTime: Math.floor(Date.now() / 1000) + 1 })
    const res = await call('GET', fresh)
    expect(res.statusCode).toBe(200)
    const body = meResponse.parse(res.json())
    expect(body).toMatchObject({ status: 'active' })
    expect(body.id).not.toBe(old.id)

    const [tombstone] = await testDb.db.select().from(users).where(eq(users.id, old.id))
    expect(tombstone).toMatchObject({ status: 'deleted', authProviderId: `deleted:${old.id}` })
    // The old session stays ended; it does not reach the new account.
    expect((await call('GET', old.token)).statusCode).toBe(401)
  })

  it('removes nothing when the photos cannot be deleted, thus a retry is safe', async () => {
    const user = await signIn('uid-r2-down')
    await seedAccount(user.id, 'r2-down')
    photos.down = true
    expect((await call('DELETE', user.token)).statusCode).toBe(500)

    expect(await testDb.db.select().from(profiles).where(eq(profiles.userId, user.id))).toHaveLength(1)
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
