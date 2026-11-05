import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { and, eq, sql } from 'drizzle-orm'
import type { WaitlistPlace } from '@roomsie/contract'
import { sessionDays } from '../src/goals/store'
import { anonymousSessions, chatTurns, feedback, goals, observations, observationTopics, tracePrompts, traces, users, waitlist } from '../src/db/schema'
import { createTestDb, type TestDb } from './db'

let t: TestDb
beforeAll(async () => {
  t = await createTestDb()
  await t.db.insert(observationTopics).values({ key: 'diet', label: 'Diet' })
  await t.db.insert(tracePrompts).values({ hash: 'prompt', text: 'Fill the slots.' })
})
afterAll(() => t.drop())

const place: WaitlistPlace = 'bhiwandi'
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000)
const deleteOldVisitors = () => t.db.execute(sql`select jobs.delete_old_visitors()`)
const userNamed = async (name: string) => (await t.db.insert(users).values({ authProviderId: `uid-${name}` }).returning({ id: users.id }))[0]!.id

/** A visitor session as a visit leaves it: its expiry is 30 days after the last visit. */
async function visitorChat(name: string, daysSinceVisit: number) {
  const [session] = await t.db.insert(anonymousSessions)
    .values({ keyHash: `key-${name}`, deviceHash: `device-${name}`, expiresAt: daysAgo(daysSinceVisit - sessionDays) })
    .returning({ id: anonymousSessions.id })
  const sessionId = session!.id
  const [goal] = await t.db.insert(goals).values({ anonymousSessionId: sessionId }).returning({ id: goals.id })
  const goalId = goal!.id
  const [turn] = await t.db.insert(chatTurns).values({ goalId, role: 'user', inputMethod: 'typed', text: 'A veg flat in Bandra' }).returning({ id: chatTurns.id })
  await t.db.insert(observations).values({ anonymousSessionId: sessionId, key: 'diet', value: 'veg', kind: 'preference', evidence: 'A veg flat', turnId: turn!.id, confidence: 0.9 })
  await t.db.insert(traces).values({
    turnKey: turn!.id, goalId, sessionCode: name, turnNumber: 1, role: 'extractor', attempt: 1, model: 'deepseek-flash', fallback: false, outcome: 'ok',
    startedAt: daysAgo(daysSinceVisit), ms: 900, tokensIn: 100, cachedTokensIn: 0, tokensOut: 10, promptHash: 'prompt', messages: { version: 1, list: [] }, answer: '{}',
  })
  await t.db.insert(feedback).values({ goalId, rating: 'good', text: 'Nice chat' })
  await t.db.insert(waitlist).values({ email: `${name}@example.com`, place, goalId })
  return { sessionId, goalId }
}

type VisitorChat = Awaited<ReturnType<typeof visitorChat>>
const countsOf = async ({ sessionId, goalId }: VisitorChat) => ({
  sessions: await t.db.$count(anonymousSessions, eq(anonymousSessions.id, sessionId)),
  goals: await t.db.$count(goals, eq(goals.id, goalId)),
  turns: await t.db.$count(chatTurns, eq(chatTurns.goalId, goalId)),
  notes: await t.db.$count(observations, eq(observations.anonymousSessionId, sessionId)),
  traces: await t.db.$count(traces, eq(traces.goalId, goalId)),
  feedback: await t.db.$count(feedback, eq(feedback.goalId, goalId)),
})
const entryOf = async (email: string) => (await t.db.select({ goalId: waitlist.goalId }).from(waitlist).where(and(eq(waitlist.email, email), eq(waitlist.place, place))))[0]

describe('the job of the old visitor chats (T-67)', () => {
  it('deletes a visitor chat 30 days after the last visit, with its goal, turns, notes, traces and feedback', async () => {
    const old = await visitorChat('old', 31)
    const recent = await visitorChat('recent', 29)
    await deleteOldVisitors()
    expect(await countsOf(old)).toEqual({ sessions: 0, goals: 0, turns: 0, notes: 0, traces: 0, feedback: 0 })
    expect(await countsOf(recent)).toEqual({ sessions: 1, goals: 1, turns: 1, notes: 1, traces: 1, feedback: 1 })
  })

  it('keeps a session that a person claimed at sign-in', async () => {
    // A claim ends the session at once, and moves its goals to the account.
    const [claimed] = await t.db.insert(anonymousSessions)
      .values({ keyHash: 'key-claimed', deviceHash: 'device-claimed', expiresAt: daysAgo(40), claimedByUserId: await userNamed('claimer') })
      .returning({ id: anonymousSessions.id })
    await deleteOldVisitors()
    expect(await t.db.$count(anonymousSessions, eq(anonymousSessions.id, claimed!.id))).toBe(1)
  })

  it('keeps the waitlist entry of an old visitor chat with no chat, until the team sets its invite time', async () => {
    await visitorChat('waiting', 45)
    await deleteOldVisitors()
    expect(await entryOf('waiting@example.com')).toEqual({ goalId: null })
    // An entry of a signed-in person keeps its chat, also after its invite.
    const [own] = await t.db.insert(goals).values({ userId: await userNamed('member') }).returning({ id: goals.id })
    await t.db.insert(waitlist).values({ email: 'member@example.com', place, goalId: own!.id, invitedAt: daysAgo(1) })
    await t.db.update(waitlist).set({ invitedAt: new Date() }).where(eq(waitlist.email, 'waiting@example.com'))
    await deleteOldVisitors()
    expect(await entryOf('waiting@example.com')).toBeUndefined()
    expect(await entryOf('member@example.com')).toEqual({ goalId: own!.id })
  })
})
