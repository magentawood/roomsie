import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { exportPKCS8, generateKeyPair } from 'jose'
import { firebaseAdmin } from '../src/firebase-admin'

let admin: ReturnType<typeof firebaseAdmin>
beforeAll(async () => {
  const { privateKey } = await generateKeyPair('RS256', { extractable: true })
  admin = firebaseAdmin({ project_id: 'roomsie-test', client_email: 'api@roomsie-test.iam.gserviceaccount.com', private_key: await exportPKCS8(privateKey) })
})
afterEach(() => vi.unstubAllGlobals())

/** Google gives a token, then `reply` to the Admin call. Records each Admin call. */
function fakeGoogle(reply: Response) {
  const calls: { url: string; body: unknown }[] = []
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'google-token', expires_in: 3600 })
    calls.push({ url, body: JSON.parse(String(init.body)) })
    return reply
  })
  return calls
}

const googleError = (status: number, message: string) => Response.json({ error: { code: status, message } }, { status })

describe('deleteUser', () => {
  it('deletes the Firebase user of the uid', async () => {
    const calls = fakeGoogle(Response.json({ kind: 'identitytoolkit#DeleteAccountResponse' }))
    await admin.deleteUser('uid-gone')
    expect(calls).toEqual([{ url: 'https://identitytoolkit.googleapis.com/v1/projects/roomsie-test/accounts:delete', body: { localId: 'uid-gone' } }])
  })

  it('counts a user that is not found as deleted, so a retry is safe', async () => {
    fakeGoogle(googleError(400, 'USER_NOT_FOUND'))
    await expect(admin.deleteUser('uid-gone')).resolves.toBeUndefined()
  })

  it('fails on each other error', async () => {
    fakeGoogle(googleError(400, 'INVALID_ID_TOKEN'))
    await expect(admin.deleteUser('uid-gone')).rejects.toThrow('Firebase delete failed: 400')
    fakeGoogle(googleError(503, 'UNAVAILABLE'))
    await expect(admin.deleteUser('uid-gone')).rejects.toThrow('Firebase delete failed: 503')
  })
})
