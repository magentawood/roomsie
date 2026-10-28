import { expect } from 'vitest'
import { listingResponse, meResponse, profileResponse } from '@roomsie/contract'
import { createTestDb } from './db'
import { projectId, testTokens } from './tokens'
import { offlineStorage } from '../scripts/openapi'
import { areas } from '../src/db/schema'
import type { Mail, Mailer } from '../src/email'
import type { Messaging } from '../src/messages/settings'
import { moderationSettings } from '../src/moderation/settings'
import { buildServer } from '../src/server'
import type { Storage } from '../src/storage'
import type { IdStore } from '../src/id-store'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type TestApp<U extends string> = Awaited<ReturnType<typeof testApp<U>>>

/** The settings of PD18 with their defaults, a change from `settings`, and the user "moderator" as the moderator. */
export const testModeration = (settings: Record<string, string> = {}) => moderationSettings.parse({ MODERATOR_UIDS: 'uid-moderator', REVIEWER_UIDS: 'uid-reviewer', ...settings })

/**
 * A Realtime, a Firebase Admin and a mailer that record their calls, and the public settings of Realtime.
 * FCM refuses a token that starts with "gone". Set `firebaseUsers.down` to make the Firebase user delete fail.
 */
export function testMessaging() {
  const sent: { userId: string; event: string; payload: object }[] = []
  const claims: { uid: string; claims: object }[] = []
  const mails: (Mail & { to: string })[] = []
  const pushes: { token: string; title: string; link: string }[] = []
  const firebaseUsers = { deleted: [] as string[], down: false }
  const messaging: Messaging = {
    realtime: { send: async (userId, { event, payload }) => { sent.push({ userId, event, payload }) } },
    firebaseAdmin: {
      setClaims: async (uid, c) => { claims.push({ uid, claims: c }) },
      sendPush: async (token, push) => {
        if (token.startsWith('gone')) return 'gone'
        pushes.push({ token, ...push })
        return 'sent'
      },
      deleteUser: async (uid) => {
        if (firebaseUsers.down) throw new Error('Firebase is down')
        firebaseUsers.deleted.push(uid)
      },
    },
    webRealtime: { url: 'https://realtime.example.com', key: 'test-anon-key' },
  }
  const mailer: Mailer = { send: async (to, mail) => { mails.push({ to, ...mail }) } }
  return { messaging, mailer, sent, claims, mails, pushes, firebaseUsers }
}

/** An ID store that records each link, delete and face match. A key that contains "stuck" fails to delete. Each face match gives `score`. */
export function testIdStore() {
  const uploads: { key: string; contentType: string; size: number }[] = []
  const views: string[] = []
  const deleted: string[] = []
  const matches: { selfieKey: string; idPhotoKey: string }[] = []
  const face = { score: 97 as number | null }
  const expiresAt = () => new Date(Date.now() + 300_000)
  const idStore: IdStore = {
    uploadUrl: async (key, contentType, size) => { uploads.push({ key, contentType, size }); return { url: `https://ids.example.com/${key}?put`, expiresAt: expiresAt() } },
    viewUrl: async (key) => { views.push(key); return { url: `https://ids.example.com/${key}?get`, expiresAt: expiresAt() } },
    deleteObjects: async (keys) => {
      if (keys.some((k) => k.includes('stuck'))) throw new Error('S3 delete failed')
      deleted.push(...keys)
    },
    faceMatch: async (selfieKey, idPhotoKey) => { matches.push({ selfieKey, idPhotoKey }); return face.score },
  }
  return { idStore, uploads, views, deleted, matches, face }
}

export const testAreas = [
  { slug: 'bandra-santacruz', name: 'Bandra–Santacruz' },
  { slug: 'bandra', name: 'Bandra', parentSlug: 'bandra-santacruz' },
  { slug: 'pali-hill', name: 'Pali Hill', parentSlug: 'bandra' },
]

/** A server on a disposable database with the test areas and one signed-in user for each name. The first user lists. Call close() when done. */
export async function testApp<U extends string>(users: readonly [U, ...U[]], storage: Storage = offlineStorage, settings: Record<string, string> = {}) {
  const testDb = await createTestDb()
  await testDb.db.insert(areas).values(testAreas)
  const { firebaseKeys, idToken } = await testTokens()
  const fakes = testMessaging()
  const idFakes = testIdStore()
  const tokens = {} as Record<U, string>
  // Each user signs in with a verified email, as Google gives it (T-55).
  for (const user of users) tokens[user] = await idToken(`uid-${user}`, { claims: { email: `${user}@example.com`, email_verified: true } })
  const app = buildServer({ webOrigin: 'http://localhost:3000', db: testDb.db, firebaseProjectId: projectId, firebaseKeys, storage, moderation: testModeration(settings), messaging: fakes.messaging, mailer: fakes.mailer, idStore: idFakes.idStore })
  // The alerts go out after the reply, so a call also waits for them.
  const call = async (who: U | null, method: Method, url: string, payload?: object, token?: string) => {
    const res = await app.inject({ method, url, payload, headers: who ? { authorization: `Bearer ${token ?? tokens[who]}` } : {} })
    await app.alerts.settled()
    return res
  }
  const ids = {} as Record<U, string>
  for (const user of users) ids[user] = meResponse.parse((await call(user, 'GET', '/v1/me')).json()).id

  /** A live owner flat of the first user. */
  async function liveListing() {
    const created = listingResponse.parse((await call(users[0], 'POST', '/v1/listings', { kind: 'owner_flat' })).json())
    expect((await call(users[0], 'PATCH', `/v1/listings/${created.id}`, { areaSlug: 'bandra', rates: [{ rent: 40000 }] })).statusCode).toBe(200)
    expect((await call(users[0], 'POST', `/v1/listings/${created.id}/status`, { status: 'live' })).statusCode).toBe(200)
    return created.id
  }
  async function liveCard(who: U, fullName = 'Divya Sharma') {
    const made = profileResponse.parse((await call(who, 'POST', '/v1/me/profile', { fullName, age: 25, gender: 'female' })).json())
    expect((await call(who, 'PATCH', '/v1/me/profile', { whosMoving: 'working', areas: ['bandra'], budgetMax: 20000 })).statusCode).toBe(200)
    return made.id
  }
  async function close() {
    await app.close()
    await testDb.drop()
  }
  return { db: testDb.db, call, ids, idStore: idFakes, liveListing, liveCard, close, sent: fakes.sent, claims: fakes.claims, mails: fakes.mails, pushes: fakes.pushes, idToken }
}
