import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { newGoalResponse, turnResponse, visitorKeyHeader } from '@roomsie/contract'
import { assistantSettings } from '../src/assistant/settings'
import { observations } from '../src/db/schema'
import { seedCatalogues } from '../src/db/seed-axes'
import { modelSettings } from '../src/models/settings'
import { backfillNotes } from '../src/observations/backfill'
import { testApp, type TestApp } from './app'
import { down, fakeRequest, fakeVendors, keys, room, routed, scored } from './vendors'

let t: TestApp<'asha'>
beforeAll(async () => {
  t = await testApp(['asha'], undefined, keys)
  await seedCatalogues(t.db)
})
afterAll(() => t.close())
afterEach(() => { vi.unstubAllGlobals() })

const noObserver = { observer: { deepseek: [down()], gemini: [down()] } }
/** A typed turn from before the observer: the observer fails, so the turn has no note. */
async function oldTurn(key: string, goalId: string, text: string, kinds = ['filters', 'context'], extracted = room()) {
  fakeVendors({ deepseek: [extracted], ...routed({ kinds }), ...noObserver })
  const res = await t.app.inject({ method: 'POST', url: `/v1/goals/${goalId}/turns`, payload: { text }, headers: { [visitorKeyHeader]: key } })
  await t.app.observerQueue.settled()
  return turnResponse.parse(res.json()).turns[0]
}
const note = (value: string, evidence: string) => ({ key: 'work_pattern', kind: 'context', value, evidence })
const backfill = (apply: boolean, before = new Date()) => backfillNotes(t.db, { req: fakeRequest().req, models: modelSettings.parse(keys)!, settings: assistantSettings.parse({}) }, { apply, before })

describe('the backfill of Form B (T-36)', () => {
  it('counts the turns with context and writes nothing without --apply, then writes their notes oldest first, one time', async () => {
    const goal = newGoalResponse.parse((await t.call(null, 'POST', '/v1/goals')).json())
    const key = goal.visitorKey!
    await oldTurn(key, goal.id, 'room chahiye, I start work at 6 am')
    await oldTurn(key, goal.id, 'room in Bandra', ['filters'])
    const second = await oldTurn(key, goal.id, 'room chahiye, now I work from home')

    const counted = await backfill(false)
    expect(counted).toMatchObject({ turns: 2, saved: 0 })
    expect(counted.estimatedRupees).toBeGreaterThan(0)
    expect(await t.db.select().from(observations)).toEqual([])

    const requests = fakeVendors({ observer: { deepseek: [scored({ notes: [note('Starts work at 6 am', 'I start work at 6 am')] }), scored({ notes: [note('Works from home', 'now I work from home')] })] } })
    expect(await backfill(true)).toMatchObject({ turns: 2, saved: 2 })
    expect(requests.observer).toHaveLength(2)
    // The newer turn wins the topic.
    expect(await t.db.select().from(observations)).toMatchObject([{ key: 'work_pattern', value: 'Works from home', turnId: second.id }])

    // A second run reads only the turn whose note the newer turn replaced, and keeps the newer note.
    const again = fakeVendors({ observer: { deepseek: [scored({ notes: [note('Starts work at 6 am', 'I start work at 6 am')] })] } })
    expect(await backfill(true)).toMatchObject({ turns: 1, saved: 0 })
    expect(again.observer).toHaveLength(1)
    expect(await t.db.select().from(observations)).toMatchObject([{ value: 'Works from home' }])
  })

  it('reads no turn from the time of --before on, so a note that the person deleted does not come back', async () => {
    const goal = newGoalResponse.parse((await t.call(null, 'POST', '/v1/goals')).json())
    await t.db.delete(observations)
    await oldTurn(goal.visitorKey!, goal.id, 'room chahiye, I start work at 7 am')
    const cut = new Date()
    await oldTurn(goal.visitorKey!, goal.id, 'room chahiye, I go to the gym at 6 am')
    const counted = await backfill(false, cut)
    const all = await backfill(false)
    expect(all.turns - counted.turns).toBe(1)
  })

  it('reads no turn of a goal where the person stated an own religion or community (PD3c)', async () => {
    const goal = newGoalResponse.parse((await t.call(null, 'POST', '/v1/goals')).json())
    const before = (await backfill(false)).turns
    await oldTurn(goal.visitorKey!, goal.id, 'room chahiye, I am Jain', ['filters', 'context'], scored({ intent: 'room', ownReligion: 'jain' }))
    await oldTurn(goal.visitorKey!, goal.id, 'room chahiye, I start work at 8 am')
    expect((await backfill(false)).turns).toBe(before)
  })
})
