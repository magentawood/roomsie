import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { adminInvitesResponse, inviteRefusalResponse } from '@roomsie/contract'
import { inviteGate, invites, users } from '../src/db/schema'
import { testApp, type TestApp } from './app'

type Who = 'moderator' | 'member' | 'stranger'
let t: TestApp<Who>
beforeAll(async () => {
  // The setup signs each person in while the gate is open, so each has an account. "uid-boss" is a moderator with no account yet.
  t = await testApp(['moderator', 'member', 'stranger'], undefined, { MODERATOR_UIDS: 'uid-moderator,uid-boss' })
})
afterAll(() => t.close())
beforeEach(async () => {
  await t.db.delete(invites)
  // With no row, the gate is closed, as after the migration.
  await t.db.delete(inviteGate)
})

const signIn = (uid: string, email: string, emailVerified = true) => t.idToken(uid, { claims: { email, email_verified: emailVerified } })
const me = async (token: string) => t.call('member', 'GET', '/v1/me', undefined, token)
const invite = (email: string) => t.call('moderator', 'POST', '/v1/admin/invites', { email })
const setGate = (inviteOnly: boolean, opensAt: string | null) => t.call('moderator', 'PUT', '/v1/admin/invite-gate', { inviteOnly, opensAt })

describe('the invite gate', () => {
  it('lets an invited email in, in any case of letters', async () => {
    expect((await invite('Asha.Rao@Example.com')).statusCode).toBe(204)
    expect((await me(await signIn('uid-asha', 'ASHA.RAO@example.com'))).statusCode).toBe(200)
  })

  it('refuses a different email with no account row, and an invited email that is not verified', async () => {
    await invite('asha.rao@example.com')
    const res = await me(await signIn('uid-newcomer', 'newcomer@example.com'))
    expect(res.statusCode).toBe(403)
    expect(inviteRefusalResponse.parse(res.json())).toEqual({ error: 'invite only', opensAt: null, account: false })
    expect(await t.db.select().from(users).where(eq(users.authProviderId, 'uid-newcomer'))).toEqual([])

    expect((await me(await signIn('uid-unverified', 'asha.rao@example.com', false))).statusCode).toBe(403)
  })

  it('lets a moderator in with no invite, also at the first sign-in', async () => {
    expect((await t.call('moderator', 'GET', '/v1/me')).statusCode).toBe(200)
    expect((await me(await signIn('uid-boss', 'boss@example.com'))).statusCode).toBe(200)
  })

  it('refuses an account that is not invited, but lets it delete itself', async () => {
    const res = await t.call('stranger', 'GET', '/v1/me')
    expect(res.statusCode).toBe(403)
    expect(inviteRefusalResponse.parse(res.json())).toMatchObject({ account: true })
    expect((await t.call('stranger', 'GET', '/v1/me/verification')).statusCode).toBe(403)
    expect((await t.call('stranger', 'DELETE', '/v1/me')).statusCode).toBe(204)
  })

  it('opens by itself at the opening time, and at once when the switch is off', async () => {
    const later = new Date(Date.now() + 86_400_000).toISOString()
    expect((await setGate(true, later)).statusCode).toBe(204)
    const closed = await t.call('member', 'GET', '/v1/me')
    expect(closed.statusCode).toBe(403)
    expect(new Date(inviteRefusalResponse.parse(closed.json()).opensAt!).getTime()).toBe(new Date(later).getTime())

    await setGate(true, new Date(Date.now() - 1000).toISOString())
    expect((await t.call('member', 'GET', '/v1/me')).statusCode).toBe(200)

    await setGate(false, later)
    expect((await t.call('member', 'GET', '/v1/me')).statusCode).toBe(200)
  })
})

describe('the admin routes of the invites', () => {
  it('list, add and remove the invites and change the gate', async () => {
    await invite('first@example.com')
    await invite('Second@Example.com')
    // An invite that exists already is not an error.
    expect((await invite('second@example.com')).statusCode).toBe(204)
    expect((await setGate(true, '2026-11-08T00:00:00+05:30')).statusCode).toBe(204)

    const list = adminInvitesResponse.parse((await t.call('moderator', 'GET', '/v1/admin/invites')).json())
    expect(list.inviteOnly).toBe(true)
    expect(new Date(list.opensAt!).toISOString()).toBe('2026-11-07T18:30:00.000Z')
    expect(list.invites.map((i) => i.email)).toEqual(['second@example.com', 'first@example.com'])

    const second = list.invites[0]!.id
    expect((await t.call('moderator', 'DELETE', `/v1/admin/invites/${second}`)).statusCode).toBe(204)
    expect(adminInvitesResponse.parse((await t.call('moderator', 'GET', '/v1/admin/invites')).json()).invites.map((i) => i.email)).toEqual(['first@example.com'])
  })

  it('are for moderators only', async () => {
    await setGate(false, null)
    expect((await t.call('member', 'GET', '/v1/admin/invites')).statusCode).toBe(404)
    expect((await t.call('member', 'POST', '/v1/admin/invites', { email: 'me@example.com' })).statusCode).toBe(404)
    expect((await t.call('member', 'PUT', '/v1/admin/invite-gate', { inviteOnly: false, opensAt: null })).statusCode).toBe(404)
    await invite('kept@example.com')
    const [kept] = adminInvitesResponse.parse((await t.call('moderator', 'GET', '/v1/admin/invites')).json()).invites
    expect((await t.call('member', 'DELETE', `/v1/admin/invites/${kept!.id}`)).statusCode).toBe(404)
  })
})
