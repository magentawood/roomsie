import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { goalResponse, newGoalResponse, profileResponse, turnResponse, visitorKeyHeader } from '@roomsie/contract'
import { anonymousSessions, chatTurns, goals, observations, profiles, waitlist } from '../src/db/schema'
import { seedCatalogues } from '../src/db/seed-axes'
import { testApp, type TestApp } from './app'
import { fakeVendors, keys, scored } from './vendors'

let t: TestApp<'asha' | 'ravi'>
const tokens = {} as Record<'asha' | 'ravi', string>
beforeAll(async () => {
  t = await testApp(['asha', 'ravi'], undefined, keys)
  await seedCatalogues(t.db)
  for (const who of ['asha', 'ravi'] as const) tokens[who] = await t.idToken(`uid-${who}`, { claims: { email: `${who}@example.com`, email_verified: true } })
})
afterAll(async () => { await t.close() })
afterEach(() => { vi.unstubAllGlobals() })

type Goal = { id: string; key: string }
async function visitorGoal(key?: string): Promise<Goal> {
  const res = await t.app.inject({ method: 'POST', url: '/v1/goals', headers: key ? { [visitorKeyHeader]: key } : {} })
  const goal = newGoalResponse.parse(res.json())
  return { id: goal.id, key: key ?? goal.visitorKey! }
}
const sent = async (goal: Goal, text: string) =>
  turnResponse.parse((await t.app.inject({ method: 'POST', url: `/v1/goals/${goal.id}/turns`, payload: { text }, headers: { [visitorKeyHeader]: goal.key } })).json())
const claim = (who: 'asha' | 'ravi' | null, key: string | null) =>
  t.app.inject({ method: 'POST', url: '/v1/goals/claim', headers: { ...(who && { authorization: `Bearer ${tokens[who]}` }), ...(key && { [visitorKeyHeader]: key }) } })
const ownerOf = async (goalId: string) => (await t.db.select({ userId: goals.userId, sessionId: goals.anonymousSessionId }).from(goals).where(eq(goals.id, goalId)))[0]!
const sessionOf = async (goalId: string) => (await ownerOf(goalId)).sessionId!

describe('the claim of a visitor chat at sign-in (T-17)', () => {
  it('moves the goals of the session to the account, with the turns, Form A, the outside places, the waitlist entries and the Form B notes', async () => {
    const goal = await visitorGoal()
    fakeVendors({ deepseek: [scored({ intent: 'room', areas: [{ words: 'Powai', slug: 'powai' }, { words: 'Vasai', slug: null }] })] })
    expect((await sent(goal, 'room in Powai or Vasai')).outsidePlaces).toEqual(['vasai-virar'])
    const join = await t.app.inject({ method: 'POST', url: `/v1/goals/${goal.id}/waitlist`, payload: { email: 'asha@example.com', place: 'vasai-virar' }, headers: { [visitorKeyHeader]: goal.key } })
    expect(join.statusCode).toBe(204)
    const sessionId = await sessionOf(goal.id)
    const [turn] = await t.db.select({ id: chatTurns.id }).from(chatTurns).where(eq(chatTurns.goalId, goal.id)).limit(1)
    await t.db.insert(observations).values({ anonymousSessionId: sessionId, key: 'work_pattern', value: 'works in Powai', kind: 'context', evidence: 'room in Powai', turnId: turn!.id, confidence: 0.9 })

    expect((await claim('asha', goal.key)).statusCode).toBe(204)

    expect(await ownerOf(goal.id)).toEqual({ userId: t.ids.asha, sessionId: null })
    const read = goalResponse.parse((await t.call('asha', 'GET', `/v1/goals/${goal.id}`)).json())
    expect([read.turns.length, read.form.intent.value, read.form.areas.value, read.outsidePlaces]).toEqual([2, 'room', ['powai'], ['vasai-virar']])
    expect(await t.db.select({ goalId: waitlist.goalId }).from(waitlist).where(eq(waitlist.goalId, goal.id))).toHaveLength(1)
    expect(await t.db.select({ userId: observations.userId, sessionId: observations.anonymousSessionId }).from(observations).where(eq(observations.turnId, turn!.id)))
      .toEqual([{ userId: t.ids.asha, sessionId: null }])
    expect(await t.db.select({ claimedBy: anonymousSessions.claimedByUserId }).from(anonymousSessions).where(eq(anonymousSessions.id, sessionId))).toEqual([{ claimedBy: t.ids.asha }])

    // The chat goes on as the account, at the next open question.
    fakeVendors({ deepseek: [scored({})] })
    const next = turnResponse.parse((await t.call('asha', 'POST', `/v1/goals/${goal.id}/turns`, { text: 'ok' })).json())
    expect(next.turns[1].text).toContain('What is your monthly budget?')
    // The key ends, so it alone opens no goal.
    expect((await t.app.inject({ method: 'GET', url: `/v1/goals/${goal.id}`, headers: { [visitorKeyHeader]: goal.key } })).statusCode).toBe(404)
  })

  it('gives the own values of the moved goals to the profile, and the latest statement wins', async () => {
    expect(profileResponse.safeParse((await t.call('ravi', 'POST', '/v1/me/profile', { fullName: 'Ravi Iyer', age: 27, gender: 'male' })).json()).success).toBe(true)
    expect((await t.call('ravi', 'PATCH', '/v1/me/profile', { religion: 'christian', community: 'tamil' })).statusCode).toBe(200)
    const older = await visitorGoal()
    const newer = await visitorGoal(older.key)
    fakeVendors({ deepseek: [scored({ ownReligion: 'sikh' })] })
    await sent(older, "I'm Sikh")
    fakeVendors({ deepseek: [scored({ ownReligion: 'hindu', ownCommunity: 'marathi' })] })
    await sent(newer, "I'm Hindu, from Pune")

    expect((await claim('ravi', older.key)).statusCode).toBe(204)

    const [profile] = await t.db.select({ religion: profiles.religion, community: profiles.community }).from(profiles).where(eq(profiles.userId, t.ids.ravi))
    expect(profile).toEqual({ religion: 'hindu', community: 'marathi' })
    expect([(await ownerOf(older.id)).userId, (await ownerOf(newer.id)).userId]).toEqual([t.ids.ravi, t.ids.ravi])
  })

  it('moves nothing on a second claim, for a session that a different account claimed, or with an expired key', async () => {
    const claimed = await visitorGoal()
    expect((await claim('ravi', claimed.key)).statusCode).toBe(204)
    expect((await claim('asha', claimed.key)).statusCode).toBe(204)
    expect((await claim('ravi', claimed.key)).statusCode).toBe(204)
    expect(await ownerOf(claimed.id)).toEqual({ userId: t.ids.ravi, sessionId: null })

    const expired = await visitorGoal()
    const sessionId = await sessionOf(expired.id)
    await t.db.update(anonymousSessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(anonymousSessions.id, sessionId))
    expect((await claim('asha', expired.key)).statusCode).toBe(204)
    expect(await ownerOf(expired.id)).toEqual({ userId: null, sessionId })
  })

  it('refuses a claim with no sign-in or no visitor key', async () => {
    const goal = await visitorGoal()
    expect((await claim(null, goal.key)).statusCode).toBe(401)
    expect((await claim('asha', null)).statusCode).toBe(400)
    expect((await ownerOf(goal.id)).userId).toBeNull()
  })
})
