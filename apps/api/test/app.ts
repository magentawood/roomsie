import { expect } from 'vitest'
import { listingResponse, meResponse } from '@roomsie/contract'
import { createTestDb } from './db'
import { projectId, testTokens } from './tokens'
import { offlineStorage } from '../scripts/openapi'
import { areas } from '../src/db/schema'
import { buildServer } from '../src/server'
import type { Storage } from '../src/storage'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type TestApp<U extends string> = Awaited<ReturnType<typeof testApp<U>>>

/** A server on a disposable database with the area "bandra" and one signed-in user for each name. The first user lists. Call close() when done. */
export async function testApp<U extends string>(users: readonly [U, ...U[]], storage: Storage = offlineStorage) {
  const testDb = await createTestDb()
  await testDb.db.insert(areas).values({ slug: 'bandra', name: 'Bandra' })
  const { firebaseKeys, idToken } = await testTokens()
  const tokens = {} as Record<U, string>
  for (const user of users) tokens[user] = await idToken(`uid-${user}`)
  const app = buildServer({ webOrigin: 'http://localhost:3000', db: testDb.db, firebaseProjectId: projectId, firebaseKeys, storage })
  const call = (who: U | null, method: Method, url: string, payload?: object) =>
    app.inject({ method, url, payload, headers: who ? { authorization: `Bearer ${tokens[who]}` } : {} })
  const ids = {} as Record<U, string>
  for (const user of users) ids[user] = meResponse.parse((await call(user, 'GET', '/v1/me')).json()).id

  /** A live owner flat of the first user. */
  async function liveListing() {
    const created = listingResponse.parse((await call(users[0], 'POST', '/v1/listings', { kind: 'owner_flat' })).json())
    expect((await call(users[0], 'PATCH', `/v1/listings/${created.id}`, { areaSlug: 'bandra', rates: [{ rent: 40000 }] })).statusCode).toBe(200)
    expect((await call(users[0], 'POST', `/v1/listings/${created.id}/status`, { status: 'live' })).statusCode).toBe(200)
    return created.id
  }
  async function close() {
    await app.close()
    await testDb.drop()
  }
  return { db: testDb.db, call, ids, liveListing, close }
}
