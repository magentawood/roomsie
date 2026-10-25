import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose'
import { meResponse } from '@roomsie/contract'
import { createTestDb, type TestDb } from './db'
import { users } from '../src/db/schema'
import { buildServer } from '../src/server'

const projectId = 'roomsie-test'
let testDb: TestDb
let app: ReturnType<typeof buildServer>
let signingKey: CryptoKey
let otherKey: CryptoKey

beforeAll(async () => {
  testDb = await createTestDb()
  const pair = await generateKeyPair('RS256')
  signingKey = pair.privateKey
  otherKey = (await generateKeyPair('RS256')).privateKey
  const firebaseKeys = createLocalJWKSet({ keys: [{ ...(await exportJWK(pair.publicKey)), kid: 'test', alg: 'RS256' }] })
  app = buildServer({ webOrigin: 'http://localhost:3000', db: testDb.db, firebaseProjectId: projectId, firebaseKeys })
})
afterAll(async () => {
  await app.close()
  await testDb.drop()
})

function idToken(uid: string, opts: { key?: CryptoKey; audience?: string; issuer?: string; iat?: number; exp?: number } = {}) {
  const now = Math.floor(Date.now() / 1000)
  const audience = opts.audience ?? projectId
  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuer(opts.issuer ?? `https://securetoken.google.com/${audience}`)
    .setAudience(audience)
    .setSubject(uid)
    .setIssuedAt(opts.iat ?? now)
    .setExpirationTime(opts.exp ?? now + 3600)
    .sign(opts.key ?? signingKey)
}

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
    expect((await me(await idToken('uid-future', { iat: later, exp: later + 3600 }))).statusCode).toBe(401)
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

  it('rejects a token issued before tokens_valid_after', async () => {
    const issued = Math.floor(Date.now() / 1000) - 60
    expect((await me(await idToken('uid-revoked', { iat: issued }))).statusCode).toBe(200)
    await testDb.db.update(users).set({ tokensValidAfter: new Date() }).where(eq(users.authProviderId, 'uid-revoked'))
    expect((await me(await idToken('uid-revoked', { iat: issued }))).statusCode).toBe(401)
  })

  it.each(['suspended', 'deleted'] as const)('rejects a %s user, also with a new token', async (status) => {
    const uid = `uid-${status}`
    expect((await me(await idToken(uid))).statusCode).toBe(200)
    await testDb.db.update(users).set({ status }).where(eq(users.authProviderId, uid))
    expect((await me(await idToken(uid))).statusCode).toBe(403)
  })
})
