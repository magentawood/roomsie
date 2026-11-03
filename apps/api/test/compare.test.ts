import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { assistantParts, goalResponse, listingResponse, newGoalResponse, profileResponse, turnResponse, visitorKeyHeader, type CompareRequest, type GoalResponse } from '@roomsie/contract'
import { desc, eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { chatTurns } from '../src/db/schema'
import { seedCatalogues } from '../src/db/seed-axes'
import { testApp, type TestApp } from './app'
import { fakeVendors, keys, room, routed, scored } from './vendors'

type Who = 'seeker' | 'owner' | 'broker' | 'pgOwner' | 'asha' | 'ravi'
let t: TestApp<Who>
const ids = {} as Record<'owner' | 'broker' | 'pg' | 'draft' | 'second' | 'third', string>
let people: [string, string]
let goalId: string

/** A place of `who`, live unless `live` is false. */
async function place(who: Who, kind: 'owner_flat' | 'broker_flat' | 'pg', edits: object, live = true) {
  const made = listingResponse.parse((await t.call(who, 'POST', '/v1/listings', { kind })).json())
  expect((await t.call(who, 'PATCH', `/v1/listings/${made.id}`, { areaSlug: 'bandra', ...edits })).statusCode).toBe(200)
  if (live) expect((await t.call(who, 'POST', `/v1/listings/${made.id}/status`, { status: 'live' })).statusCode).toBe(200)
  return made.id
}

beforeAll(async () => {
  t = await testApp(['seeker', 'owner', 'broker', 'pgOwner', 'asha', 'ravi'], undefined, keys)
  await seedCatalogues(t.db)
  ids.owner = await place('owner', 'owner_flat', {
    rates: [{ rent: 20_000, deposit: 40_000 }], maintenance: 1000, nearestStation: 'Bandra', walkStation: '10_min', availableFrom: '2026-12-01', minStay: '6_months', furnishing: 'semi',
  })
  ids.broker = await place('broker', 'broker_flat', { rates: [{ rent: 25_000, deposit: 50_000 }], brokerage: 25_000 })
  ids.pg = await place('pgOwner', 'pg', { pgName: 'Shivraj PG', sharing: ['single', 'double'], rates: [{ sharing: 'single', rent: 18_000, deposit: 18_000 }, { sharing: 'double', rent: 12_000, deposit: 12_000 }] })
  ids.draft = await place('owner', 'owner_flat', { rates: [{ rent: 30_000 }] }, false)
  ids.second = await place('owner', 'owner_flat', { rates: [{ rent: 31_000 }] })
  ids.third = await place('broker', 'broker_flat', { rates: [{ rent: 32_000 }], brokerage: 32_000 })
  people = [await t.liveCard('asha', 'Asha Rao'), await t.liveCard('ravi', 'Ravi Shah')]
  expect((await t.call('asha', 'PATCH', '/v1/me/profile', { religion: 'hindu', community: 'marathi', bio: 'Early riser.', jobRole: 'Designer' })).statusCode).toBe(200)
  goalId = newGoalResponse.parse((await t.call('seeker', 'POST', '/v1/goals')).json()).id
})
afterAll(() => t.close())
afterEach(() => { vi.unstubAllGlobals() })

const ask = (text: string, compare: CompareRequest, who: Who = 'seeker', goal = goalId) => t.call(who, 'POST', `/v1/goals/${goal}/turns`, { text, compare })
const answer = async (text: string, compare: CompareRequest) => {
  const res = await ask(text, compare)
  expect(res.statusCode).toBe(200)
  return turnResponse.parse(res.json()).turns[1]
}
const personTables = (goal: GoalResponse) => goal.turns.flatMap((turn) => (turn.comparison?.kind === 'person' ? [turn.comparison] : []))

describe('the comparison of selected cards (T-49)', () => {
  it('compares the selected places from their database fields, in the given order, with no composer call', async () => {
    const requests = fakeVendors({ deepseek: [scored({})], ...routed({ kinds: ['question'] }) })
    const reply = await answer('which one is the cheapest to move in?', { kind: 'place', ids: [ids.broker, ids.owner, ids.pg] })
    expect(reply.text).toBe('Option 1 matches your answers best. Option 3 needs the least cash to move in: ₹24,000.')
    expect(reply.comparison).toMatchObject({
      kind: 'place',
      options: [
        { id: ids.broker, rent: 25_000, deposit: 50_000, brokerage: 25_000, moveInCash: 100_000 },
        {
          id: ids.owner, rent: 20_000, deposit: 40_000, moveInCash: 60_000, maintenance: 1000, nearestStation: 'Bandra', walkStation: '10_min',
          availableFrom: '2026-12-01', minStay: '6_months', furnishing: 'semi', verified: false,
        },
        // A PG gives its lowest rent and the deposit of that rent.
        { id: ids.pg, title: 'Shivraj PG', rent: 12_000, deposit: 12_000, moveInCash: 24_000 },
      ],
    })
    expect(requests.composer).toEqual([])
    // A reload shows the same table, because the turn keeps it.
    const goal = goalResponse.parse((await t.call('seeker', 'GET', `/v1/goals/${goalId}`)).json())
    expect(goal.turns.at(-1)!.comparison).toEqual(reply.comparison)
  })

  it('compares people with only the fields of their cards: never the religion, the community or the bio', async () => {
    fakeVendors({ deepseek: [scored({})], ...routed({ kinds: ['question'] }) })
    const reply = await answer('compare these two', { kind: 'person', ids: people })
    expect(reply.text).toBe('Option 1 matches your answers best.')
    expect(reply.comparison?.kind).toBe('person')
    const [asha] = reply.comparison!.options
    expect(asha).toMatchObject({ id: people[0], fullName: 'Asha Rao', age: 25, jobRole: 'Designer', whosMoving: 'working', budgetMax: 20_000, verified: false })
    expect(JSON.stringify(reply.comparison)).not.toMatch(/hindu|marathi|Early riser|religion|community|bio/)
  })

  it('answers a filter with the normal chat, and a comparison keeps the open question of that reply', async () => {
    fakeVendors({ deepseek: [room()], ...routed({ kinds: ['filters'] }) })
    const reply = await answer('a room please', { kind: 'place', ids: [ids.owner, ids.pg] })
    expect(reply.comparison).toBeNull()
    expect(reply.text).not.toMatch(/^Option/)
    const lastParts = async () => assistantParts.parse((await t.db.select({ parts: chatTurns.parts }).from(chatTurns)
      .where(eq(chatTurns.goalId, goalId)).orderBy(desc(chatTurns.createdAt)).limit(1))[0]!.parts)
    const asked = await lastParts()
    fakeVendors({ deepseek: [scored({})], ...routed({ kinds: ['question'] }) })
    await answer('and which is cheaper?', { kind: 'place', ids: [ids.owner, ids.pg] })
    expect(await lastParts()).toMatchObject({ asked: asked.asked, question: asked.question })
  })

  it('hands off a 2b question first, then gives the table (PD10)', async () => {
    fakeVendors({ deepseek: [scored({})], ...routed({ kinds: ['question'], band: 'consequential' }) })
    const reply = await answer('is the agreement of these legal?', { kind: 'place', ids: [ids.owner, ids.pg] })
    expect(reply.text).toMatch(/^That needs a real answer, not a guess from me\..* Option 1 matches your answers best\./)
    expect(reply.comparison?.kind).toBe('place')
  })

  it('refuses a card that the person cannot see, a card of the other kind, one card, five cards and a guest, before any model call', async () => {
    const requests = fakeVendors({})
    const status = async (compare: object, who: Who = 'seeker') => (await t.call(who, 'POST', `/v1/goals/${goalId}/turns`, { text: 'compare', compare })).statusCode
    expect(await status({ kind: 'place', ids: [ids.owner, ids.draft] })).toBe(400)
    expect(await status({ kind: 'place', ids: [ids.owner, people[0]] })).toBe(400)
    expect(await status({ kind: 'place', ids: [ids.owner] })).toBe(400)
    // Five cards that the person can see: only the count refuses them.
    expect(await status({ kind: 'place', ids: [ids.owner, ids.broker, ids.pg, ids.second, ids.third] })).toBe(400)
    const visitor = newGoalResponse.parse((await t.call(null, 'POST', '/v1/goals')).json())
    const guest = await t.app.inject({ method: 'POST', url: `/v1/goals/${visitor.id}/turns`, payload: { text: 'compare', compare: { kind: 'place', ids: [ids.owner, ids.pg] } }, headers: { [visitorKeyHeader]: visitor.visitorKey! } })
    expect(guest.statusCode).toBe(401)
    expect([...requests, ...requests.router, ...requests.composer]).toEqual([])
  })

  it('refuses the own listing of the person, which the results never show', async () => {
    fakeVendors({})
    const own = newGoalResponse.parse((await t.call('owner', 'POST', '/v1/goals')).json())
    expect((await ask('compare', { kind: 'place', ids: [ids.owner, ids.pg] }, 'owner', own.id)).statusCode).toBe(400)
  })

  it('reads a person card only through the visibility rules', async () => {
    expect(profileResponse.parse((await t.call('ravi', 'PATCH', '/v1/me/profile', { hidden: true })).json()).visibility).toBe('hidden')
    fakeVendors({})
    expect((await ask('compare', { kind: 'person', ids: people })).statusCode).toBe(400)
    expect((await t.call('ravi', 'PATCH', '/v1/me/profile', { hidden: false })).statusCode).toBe(200)
  })

  it('turns a deleted person into "Deleted user" in each saved comparison (PD19)', async () => {
    expect((await t.call('asha', 'DELETE', '/v1/me')).statusCode).toBe(204)
    const goal = goalResponse.parse((await t.call('seeker', 'GET', `/v1/goals/${goalId}`)).json())
    const people = personTables(goal)
    expect(people).toHaveLength(1)
    expect(people[0]!.options[0]).toEqual({
      id: expect.any(String), fullName: 'Deleted user', age: null, jobRole: null, whosMoving: 'unclear', budgetMin: null, budgetMax: null, moveDate: null, lifestyle: {}, verified: false,
    })
    expect(people[0]!.options[1]).toMatchObject({ fullName: 'Ravi Shah' })
    expect(JSON.stringify(goal)).not.toMatch(/Asha|Designer/)
  })

  it('turns a blocked person into "Not available" in the saved comparisons of the blocker', async () => {
    expect((await t.call('seeker', 'POST', '/v1/blocks', { id: uuidv7(), profileId: people[1] })).statusCode).toBe(204)
    const table = personTables(goalResponse.parse((await t.call('seeker', 'GET', `/v1/goals/${goalId}`)).json()))[0]!
    expect(table.options[1]).toMatchObject({ id: people[1], fullName: 'Not available', age: null, jobRole: null, lifestyle: {} })
  })

  it('after a block, the blocker is "Not available" in the chats of the blocked person, and a third chat keeps the values', async () => {
    const cards = [await t.liveCard('owner', 'Om Kale'), await t.liveCard('broker', 'Bina Das')]
    const comparedBy = async (who: Who) => {
      const goal = newGoalResponse.parse((await t.call(who, 'POST', '/v1/goals')).json()).id
      fakeVendors({ deepseek: [scored({})], ...routed({ kinds: ['question'] }) })
      expect((await ask('compare', { kind: 'person', ids: cards }, who, goal)).statusCode).toBe(200)
      return async () => goalResponse.parse((await t.call(who, 'GET', `/v1/goals/${goal}`)).json()).turns.at(-1)!.comparison!.options[0]
    }
    const [ravisFirst, thirdsFirst] = [await comparedBy('ravi'), await comparedBy('pgOwner')]
    expect((await t.call('owner', 'POST', '/v1/blocks', { id: uuidv7(), profileId: people[1] })).statusCode).toBe(204)
    expect(await ravisFirst()).toMatchObject({ id: cards[0], fullName: 'Not available', age: null })
    expect(await thirdsFirst()).toMatchObject({ id: cards[0], fullName: 'Om Kale', age: 25 })
  })
})
