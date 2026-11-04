import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { goalResponse, newGoalResponse, notesResponse, turnResponse, visitorKeyHeader } from '@roomsie/contract'
import { observations } from '../src/db/schema'
import { seedCatalogues } from '../src/db/seed-axes'
import { testApp, type TestApp } from './app'
import { down, fakeVendors, keys, room, roomAck, routed, scored } from './vendors'

let t: TestApp<'asha' | 'ravi'>
beforeAll(async () => {
  t = await testApp(['asha', 'ravi'], undefined, keys)
  await seedCatalogues(t.db)
})
afterAll(() => t.close())
afterEach(() => { vi.unstubAllGlobals() })

type Goal = { id: string; key: string }
async function visitorGoal(): Promise<Goal> {
  const goal = newGoalResponse.parse((await t.call(null, 'POST', '/v1/goals')).json())
  return { id: goal.id, key: goal.visitorKey! }
}
/** A typed turn. It waits for the observer, which runs after the reply. */
async function sent(goal: Goal, text: string) {
  const res = await t.app.inject({ method: 'POST', url: `/v1/goals/${goal.id}/turns`, payload: { text }, headers: { [visitorKeyHeader]: goal.key } })
  await t.app.observerQueue.settled()
  expect(res.statusCode).toBe(200)
  return turnResponse.parse(res.json())
}
const notesOf = async (key: string) => notesResponse.parse((await t.app.inject({ method: 'GET', url: '/v1/notes', headers: { [visitorKeyHeader]: key } })).json()).notes
const deleteNote = (id: string, headers: Record<string, string>) => t.app.inject({ method: 'DELETE', url: `/v1/notes/${id}`, headers })

const nightShifts = { key: 'work_pattern', kind: 'context', value: 'Works night shifts', evidence: 'I work night shifts' }
const withNote = (note = nightShifts) => ({ observer: { deepseek: [scored({ notes: [note] })] } })
const context = () => routed({ kinds: ['filters', 'context'] })
const asksNotes = () => routed({ kinds: ['question'], notes: true })

describe('the observer in the chat', () => {
  it('saves a note on the typed turn of the person, after the reply', async () => {
    const requests = fakeVendors({ deepseek: [room()], ...context(), ...withNote() })
    const goal = await visitorGoal()
    const { turns } = await sent(goal, 'room chahiye, I work night shifts')
    expect(turns[1].text).toBe(roomAck)
    expect(requests.observer).toHaveLength(1)
    const [saved] = await t.db.select().from(observations).where(eq(observations.turnId, turns[0].id))
    expect(saved).toMatchObject({ key: 'work_pattern', evidence: 'I work night shifts', visible: true, anonymousSessionId: expect.any(String) })
    expect(await notesOf(goal.key)).toEqual([{ id: saved!.id, key: 'work_pattern', label: 'Work hours and work from home', value: 'Works night shifts', evidence: 'I work night shifts' }])
  })

  it.each([
    ['a turn with no context', routed({ kinds: ['filters'] })],
    ['a sensitive turn', routed({ kinds: ['context', 'filters'], band: 'sensitive' })],
    ['a turn that is only a question', routed({ kinds: ['context', 'question'] })],
    ['an off-topic turn', routed({ kinds: ['context'], band: 'out_of_scope' })],
    ['a turn that states a community preference', routed({ kinds: ['context', 'filters'], community: true })],
  ])('calls no observer for %s', async (_, label) => {
    const requests = fakeVendors({ deepseek: [room()], ...label })
    await sent(await visitorGoal(), 'I work night shifts, room chahiye')
    expect(requests.observer).toHaveLength(0)
  })

  it('sends the reply when the observer fails, and saves no note', async () => {
    fakeVendors({ deepseek: [room()], ...context(), observer: { deepseek: [down()], gemini: [down()] } })
    const goal = await visitorGoal()
    expect((await sent(goal, 'room chahiye, I work night shifts')).turns[1].text).toBe(roomAck)
    expect(await notesOf(goal.key)).toEqual([])
  })
})

describe('"What do you know about me?"', () => {
  it('answers with the notes flag and a scripted line, with no composer, and keeps the open question', async () => {
    fakeVendors({ deepseek: [room()], ...context(), ...withNote() })
    const goal = await visitorGoal()
    await sent(goal, 'room chahiye, I work night shifts')
    const requests = fakeVendors({ deepseek: [scored({})], ...asksNotes() })
    const { turns } = await sent(goal, 'what do you know about me?')
    expect(turns[1]).toMatchObject({ text: "Here's what I've noted from our chat. To fix a note, tell me what changed.", notes: true })
    expect(requests.composer).toHaveLength(0)
    const reloaded = goalResponse.parse((await t.app.inject({ method: 'GET', url: `/v1/goals/${goal.id}`, headers: { [visitorKeyHeader]: goal.key } })).json())
    expect(reloaded.turns.at(-1)).toMatchObject({ notes: true })
    // The next turn still answers the question of the last reply.
    const next = fakeVendors({ deepseek: [scored({})] })
    await sent(goal, 'Bandra')
    expect((next[0]!.body as { messages: { content: string }[] }).messages[1]!.content).toContain('Last question of the assistant: Which areas')
  })

  it('tells a person with no notes that it noted nothing', async () => {
    fakeVendors({ deepseek: [scored({})], ...asksNotes() })
    const { turns } = await sent(await visitorGoal(), 'mere baare mein kya pata hai?')
    expect(turns[1]).toMatchObject({ text: "I haven't noted anything about you yet.", notes: false })
  })

  it('ends the first reply after the first note with the hint, one time', async () => {
    fakeVendors({ deepseek: [room()], ...context(), ...withNote() })
    const goal = await visitorGoal()
    expect((await sent(goal, 'room chahiye, I work night shifts')).turns[1].text).toBe(roomAck)
    const hint = "I keep short notes from what you tell me. Ask \"what do you know about me?\" to see or delete them."
    fakeVendors({ deepseek: [scored({})] })
    expect((await sent(goal, 'hmm')).turns[1].text).toMatch(new RegExp(`${hint.replace(/[?.]/g, '\\$&')}$`))
    fakeVendors({ deepseek: [scored({})] })
    expect((await sent(goal, 'ok')).turns[1].text).not.toContain(hint)
  })

  it('gives the hint after the first note, also to a person who asked before any note', async () => {
    fakeVendors({ deepseek: [scored({})], ...asksNotes() })
    const goal = await visitorGoal()
    await sent(goal, 'what do you know about me?')
    fakeVendors({ deepseek: [room()], ...context(), ...withNote() })
    await sent(goal, 'room chahiye, I work night shifts')
    fakeVendors({ deepseek: [scored({})] })
    expect((await sent(goal, 'hmm')).turns[1].text).toContain('I keep short notes from what you tell me.')
  })

  it('keeps the hint off a sensitive reply, and gives it on the next reply', async () => {
    fakeVendors({ deepseek: [room()], ...context(), ...withNote() })
    const goal = await visitorGoal()
    await sent(goal, 'room chahiye, I work night shifts')
    fakeVendors({ deepseek: [scored({})], ...routed({ kinds: ['context'], band: 'sensitive' }) })
    expect((await sent(goal, 'I lost my job today')).turns[1].text).not.toContain('I keep short notes')
    fakeVendors({ deepseek: [scored({})] })
    expect((await sent(goal, 'ok')).turns[1].text).toContain('I keep short notes')
  })
})

describe('the delete of a note', () => {
  it('deletes a note of the owner, as a database action, and refuses a note of a different owner', async () => {
    fakeVendors({ deepseek: [room()], ...context(), ...withNote() })
    const goal = await visitorGoal()
    await sent(goal, 'room chahiye, I work night shifts')
    const [note] = await notesOf(goal.key)
    const other = await visitorGoal()
    expect((await deleteNote(note!.id, { [visitorKeyHeader]: other.key })).statusCode).toBe(404)
    expect((await deleteNote(note!.id, { authorization: `Bearer ${t.tokens.ravi}` })).statusCode).toBe(404)
    expect((await deleteNote(note!.id, { [visitorKeyHeader]: goal.key })).statusCode).toBe(204)
    expect(await notesOf(goal.key)).toEqual([])
  })

  it('lists and deletes the notes of a signed-in user', async () => {
    const goalRes = newGoalResponse.parse((await t.call('asha', 'POST', '/v1/goals')).json())
    fakeVendors({ deepseek: [room()], ...context(), ...withNote() })
    const res = await t.call('asha', 'POST', `/v1/goals/${goalRes.id}/turns`, { text: 'room chahiye, I work night shifts' })
    expect(res.statusCode).toBe(200)
    const asha = { authorization: `Bearer ${t.tokens.asha}` }
    const { notes } = notesResponse.parse((await t.app.inject({ method: 'GET', url: '/v1/notes', headers: asha })).json())
    expect(notes).toMatchObject([{ key: 'work_pattern' }])
    expect((await deleteNote(notes[0]!.id, asha)).statusCode).toBe(204)
  })

  it('gives an empty list, and refuses a delete, with no sign-in and no key', async () => {
    expect(notesResponse.parse((await t.app.inject({ method: 'GET', url: '/v1/notes' })).json())).toEqual({ notes: [] })
    expect((await deleteNote(crypto.randomUUID(), {})).statusCode).toBe(404)
  })
})
