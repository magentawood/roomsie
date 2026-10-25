import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { errors, generateKeyPair, type CryptoKey } from 'jose'
import { meResponse } from '@roomsie/contract'
import { createTestDb, type TestDb } from './db'
import { projectId, testTokens } from './tokens'
import { users } from '../src/db/schema'
import { buildServer } from '../src/server'
import { unconfiguredPhotoStore } from '../src/storage'

let testDb: TestDb
let app: ReturnType<typeof buildServer>
let idToken: Awaited<ReturnType<typeof testTokens>>['idToken']
let otherKey: CryptoKey

beforeAll(async () => {
  testDb = await createTestDb()
  const tokens = await testTokens()
  idToken = tokens.idToken
  otherKey = (await generateKeyPair('RS256')).privateKey
  app = buildServer({ webOrigin: 'http://localhost:3000', db: testDb.db, firebaseProjectId: projectId, firebaseKeys: tokens.firebaseKeys, photos: unconfiguredPhotoStore })
})
afterAll(async () => {
  await app.close()
  await testDb.drop()
})

const me = (token?: string) =>
  app.inject({ method: 'GET', url: '/v1/me', headers: token ? { authorization: `Bearer ${token}` } : {} })

describe('GET /v1/me', () => {
  it('rejects a request with no token', async () => {
    expect((await me()).statusCode).toBe(401)
  })

  it('rejects a token with a bad signature', async () => {
    expect((await me(await idToken('uid-bad-sig', { key: otherKey }))).statusCode).toBe(401)
  })

  it('rejects a token for a different Firebase project', async () => {
    expect((await me(await idToken('uid-other-project', { audience: 'someone-else' }))).statusCode).toBe(401)
  })

  it('rejects a token from a different issuer', async () => {
    expect((await me(await idToken('uid-other-issuer', { issuer: 'https://accounts.google.com' }))).statusCode).toBe(401)
  })

  it('rejects a token issued in the future', async () => {
    const later = Math.floor(Date.now() / 1000) + 600
    expect((await me(await idToken('uid-future', { iat: later }))).statusCode).toBe(401)
  })

  it('rejects a token with no auth_time', async () => {
    expect((await me(await idToken('uid-no-auth-time', { authTime: null }))).statusCode).toBe(401)
  })

  it('rejects a token with an empty uid', async () => {
    expect((await me(await idToken(''))).statusCode).toBe(401)
  })

  it('rejects an expired token', async () => {
    const past = Math.floor(Date.now() / 1000) - 7200
    expect((await me(await idToken('uid-expired', { iat: past, exp: past + 3600 }))).statusCode).toBe(401)
  })

  it('creates the users row at the first sign-in, and only once', async () => {
    const first = await me(await idToken('uid-new'))
    expect(first.statusCode).toBe(200)
    const body = meResponse.parse(first.json())
    expect(body.status).toBe('active')

    const second = await me(await idToken('uid-new'))
    expect(meResponse.parse(second.json()).id).toBe(body.id)
    expect(await testDb.db.select().from(users).where(eq(users.authProviderId, 'uid-new'))).toHaveLength(1)
  })

  it('rejects a session that signed in before tokens_valid_after, also with a refreshed token', async () => {
    const now = Math.floor(Date.now() / 1000)
    const signedIn = now - 60
    expect((await me(await idToken('uid-revoked', { iat: signedIn }))).statusCode).toBe(200)
    await testDb.db.update(users).set({ tokensValidAfter: new Date((now - 30) * 1000) }).where(eq(users.authProviderId, 'uid-revoked'))
    expect((await me(await idToken('uid-revoked', { iat: signedIn }))).statusCode).toBe(401)
    // Firebase refreshes the ID token with a new iat, but the same auth_time.
    expect((await me(await idToken('uid-revoked', { iat: now, authTime: signedIn }))).statusCode).toBe(401)
    expect((await me(await idToken('uid-revoked', { iat: now, authTime: now }))).statusCode).toBe(200)
  })

  // A deleted user is in account.test.ts: a new sign-in makes a new account.
  it('rejects a suspended user, also with a new token', async () => {
    const uid = 'uid-suspended'
    expect((await me(await idToken(uid))).statusCode).toBe(200)
    await testDb.db.update(users).set({ status: 'suspended' }).where(eq(users.authProviderId, uid))
    expect((await me(await idToken(uid))).statusCode).toBe(403)
  })

  it("gives 500, not 401, when Google's keys cannot be fetched", async () => {
    const down = buildServer({
      webOrigin: 'http://localhost:3000',
      db: testDb.db,
      firebaseProjectId: projectId,
      photos: unconfiguredPhotoStore,
      firebaseKeys: () => Promise.reject(new errors.JOSEError('Expected 200 OK from the JSON Web Key Set HTTP response')),
    })
    const res = await down.inject({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${await idToken('uid-keys-down')}` } })
    expect(res.statusCode).toBe(500)
    await down.close()
  })
})
