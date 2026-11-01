import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import type { Observation } from '@roomsie/contract'
import { createTestDb, type TestDb } from './db'
import { anonymousSessions, chatTurns, goals, observationTopics, users } from '../src/db/schema'
import { deleteObservation, moveObservations, observationsOf, saveObservation, type Owner } from '../src/observations/read'

let testDb: TestDb

beforeAll(async () => {
  testDb = await createTestDb()
  await testDb.db.insert(observationTopics).values([
    { key: 'guest_frequency', label: 'Guests' },
    { key: 'noise', label: 'Noise' },
    { key: 'retired_topic', label: 'Retired', active: false },
  ])
})
afterAll(() => testDb.drop())

const newUser = async () => {
  const [user] = await testDb.db.insert(users).values({ authProviderId: crypto.randomUUID() }).returning()
  return { userId: user!.id } satisfies Owner
}
const newSession = async () => {
  const [session] = await testDb.db.insert(anonymousSessions)
    .values({ deviceHash: 'device', expiresAt: new Date(Date.now() + 86_400_000) }).returning()
  return { anonymousSessionId: session!.id } satisfies Owner
}

async function typedTurn(owner: Owner, text: string) {
  const [goal] = await testDb.db.insert(goals).values(owner).returning()
  const [turn] = await testDb.db.insert(chatTurns).values({ goalId: goal!.id, role: 'user', inputMethod: 'typed', text }).returning()
  return turn!.id
}

const note = (turn: string, over: Partial<Observation> = {}): Observation => ({
  version: 1, key: 'guest_frequency', value: 'partner stays over most nights', kind: 'concern',
  evidence: 'my partner basically lives with me', turn, confidence: 0.8, visible: true, ...over,
})

describe('saveObservation', () => {
  it('saves a note on a topic of the catalogue, and the owner reads it back', async () => {
    const owner = await newUser()
    const turn = await typedTurn(owner, 'my partner basically lives with me')
    expect(await saveObservation(testDb.db, owner, note(turn))).toBe(true)
    expect(await observationsOf(testDb.db, owner)).toEqual([expect.objectContaining(note(turn))])
  })

  it.each(['not_a_topic', 'retired_topic'])('rejects the topic %s', async (key) => {
    const owner = await newUser()
    const turn = await typedTurn(owner, 'my partner basically lives with me')
    expect(await saveObservation(testDb.db, owner, note(turn, { key }))).toBe(false)
    expect(await observationsOf(testDb.db, owner)).toEqual([])
  })

  it('keeps one note for each topic: the newer note replaces the older', async () => {
    const owner = await newSession()
    const first = await typedTurn(owner, 'guests are fine')
    const second = await typedTurn(owner, 'my partner basically lives with me')
    await saveObservation(testDb.db, owner, note(first, { value: 'fine with guests', evidence: 'guests are fine', kind: 'preference' }))
    await saveObservation(testDb.db, owner, note(second))
    expect(await observationsOf(testDb.db, owner)).toEqual([expect.objectContaining(note(second))])
  })
})

describe('the lifecycle of a note', () => {
  it('goes when its chat turn goes', async () => {
    const owner = await newUser()
    const turn = await typedTurn(owner, 'my partner basically lives with me')
    await saveObservation(testDb.db, owner, note(turn))
    await testDb.db.delete(chatTurns).where(eq(chatTurns.id, turn))
    expect(await observationsOf(testDb.db, owner)).toEqual([])
  })

  it('lets only its owner delete it', async () => {
    const owner = await newUser()
    const other = await newUser()
    await saveObservation(testDb.db, owner, note(await typedTurn(owner, 'my partner basically lives with me')))
    const [saved] = await observationsOf(testDb.db, owner)
    await deleteObservation(testDb.db, other, saved!.id)
    expect(await observationsOf(testDb.db, owner)).toHaveLength(1)
    await deleteObservation(testDb.db, owner, saved!.id)
    expect(await observationsOf(testDb.db, owner)).toEqual([])
  })
})

describe('moveObservations', () => {
  it('gives the notes of a session to the user, and the newer note of a topic stays', async () => {
    const user = await newUser()
    const session = await newSession()
    const userNoise = await typedTurn(user, 'the street is loud')
    const sessionGuests = await typedTurn(session, 'my partner basically lives with me')
    // The user note on guests is the newer. The session note on noise is the newer.
    await saveObservation(testDb.db, session, note(await typedTurn(session, 'quiet please'), { key: 'noise', value: 'wants quiet', evidence: 'quiet please' }))
    await saveObservation(testDb.db, user, note(userNoise, { key: 'noise', value: 'loud street', evidence: 'the street is loud' }))
    await saveObservation(testDb.db, session, note(sessionGuests))
    const sessionNoise = await typedTurn(session, 'I need silence to sleep')
    await saveObservation(testDb.db, session, note(sessionNoise, { key: 'noise', value: 'needs silence', evidence: 'I need silence to sleep' }))
    const userGuests = await typedTurn(user, 'no guests ever')
    await saveObservation(testDb.db, user, note(userGuests, { value: 'no guests', evidence: 'no guests ever' }))

    await testDb.db.transaction((tx) => moveObservations(tx, { anonymousSessionId: session.anonymousSessionId, userId: user.userId }))

    const notes = await observationsOf(testDb.db, user)
    expect(notes.map((n) => [n.key, n.value]).sort()).toEqual([['guest_frequency', 'no guests'], ['noise', 'needs silence']])
    expect(await observationsOf(testDb.db, session)).toEqual([])
  })
})
