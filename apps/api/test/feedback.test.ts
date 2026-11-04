import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { feedbackResponse, newGoalResponse, visitorKeyHeader } from '@roomsie/contract'
import { feedback } from '../src/db/schema'
import { testApp, type TestApp } from './app'

let t: TestApp<'moderator' | 'seeker' | 'leaver'>
beforeAll(async () => { t = await testApp(['moderator', 'seeker', 'leaver']) })
afterAll(() => t.close())
beforeEach(async () => { await t.db.delete(feedback) })

const send = (who: 'moderator' | 'seeker' | 'leaver' | null, text: string) => t.call(who, 'POST', '/v1/feedback', { text })
const listed = async () => feedbackResponse.parse((await t.call('moderator', 'GET', '/v1/admin/feedback')).json()).feedback

describe('feedback', () => {
  it('needs sign-in and a text of 2,000 characters at most', async () => {
    expect((await send(null, 'Nice')).statusCode).toBe(401)
    expect((await send('seeker', 'x'.repeat(2001))).statusCode).toBe(400)
    expect((await send('seeker', '  ')).statusCode).toBe(400)
    expect((await send('seeker', 'The film is nice')).statusCode).toBe(204)
    expect((await t.db.select().from(feedback)).map((f) => [f.userId, f.text])).toEqual([[t.ids.seeker, 'The film is nice']])
  })

  it('shows the newest 100 to a moderator, with no sender, and nothing to other people', async () => {
    await t.db.insert(feedback).values(Array.from({ length: 101 }, (_, i) => ({
      userId: t.ids.seeker, text: `Note ${i + 1}`, createdAt: new Date(Date.now() - (100 - i) * 1000),
    })))
    const items = await listed()
    expect(items).toHaveLength(100)
    expect(items[0]).toEqual({ id: expect.any(String), text: 'Note 101', rating: null, createdAt: expect.any(String) })
    expect(items.at(-1)!.text).toBe('Note 2')
    expect((await t.call('seeker', 'GET', '/v1/admin/feedback')).statusCode).toBe(404)
    expect((await t.call(null, 'GET', '/v1/admin/feedback')).statusCode).toBe(401)
  })

  it('goes when its person deletes the account, also the feedback of a closed goal', async () => {
    expect((await send('leaver', 'Bye')).statusCode).toBe(204)
    const goal = await closedGoal('leaver')
    expect((await t.call('leaver', 'POST', `/v1/goals/${goal}/feedback`, { rating: 'bad', text: 'Bye again' })).statusCode).toBe(204)
    expect((await send('seeker', 'Stay')).statusCode).toBe(204)
    expect((await t.call('leaver', 'DELETE', '/v1/me')).statusCode).toBe(204)
    expect((await t.db.select().from(feedback)).map((f) => f.text)).toEqual(['Stay'])
  })
})

/** A goal that its owner closed: the pop-up of the feedback follows a close (T-50). */
async function closedGoal(who: 'seeker' | 'leaver') {
  const goal = newGoalResponse.parse((await t.call(who, 'POST', '/v1/goals')).json()).id
  expect((await t.call(who, 'POST', `/v1/goals/${goal}/close`, { where: 'roomsie' })).statusCode).toBe(200)
  return goal
}

describe('the feedback of a closed goal (T-50)', () => {
  it('takes a face and optional words from the owner of a closed goal, one time for each goal', async () => {
    const open = newGoalResponse.parse((await t.call('seeker', 'POST', '/v1/goals')).json()).id
    expect((await t.call('seeker', 'POST', `/v1/goals/${open}/feedback`, { rating: 'good' })).statusCode).toBe(409)
    const goal = await closedGoal('seeker')
    expect((await t.call('moderator', 'POST', `/v1/goals/${goal}/feedback`, { rating: 'good' })).statusCode).toBe(404)
    expect((await t.call('seeker', 'POST', `/v1/goals/${goal}/feedback`, { text: 'No face' })).statusCode).toBe(400)
    expect((await t.call('seeker', 'POST', `/v1/goals/${goal}/feedback`, { rating: 'great' })).statusCode).toBe(400)
    expect((await t.call('seeker', 'POST', `/v1/goals/${goal}/feedback`, { rating: 'good' })).statusCode).toBe(204)
    expect((await t.call('seeker', 'POST', `/v1/goals/${goal}/feedback`, { rating: 'bad', text: 'Again' })).statusCode).toBe(409)
    // After a reopen, the next close asks for no second feedback.
    expect((await t.call('seeker', 'POST', `/v1/goals/${goal}/reopen`)).statusCode).toBe(204)
    expect((await t.call('seeker', 'POST', `/v1/goals/${goal}/close`, { where: 'elsewhere' })).json()).toEqual({ askFeedback: false })
    expect((await t.db.select().from(feedback)).map(({ userId, goalId, rating, text }) => ({ userId, goalId, rating, text }))).toEqual([
      { userId: null, goalId: goal, rating: 'good', text: null },
    ])
  })

  it('takes the feedback of a visitor for the closed goal of the visitor, and the list shows the face with no sender', async () => {
    const made = newGoalResponse.parse((await t.call(null, 'POST', '/v1/goals')).json())
    const asVisitor = (url: string, payload?: object) => t.app.inject({ method: 'POST', url, payload, headers: { [visitorKeyHeader]: made.visitorKey! } })
    expect((await asVisitor(`/v1/goals/${made.id}/close`, { where: 'elsewhere' })).statusCode).toBe(200)
    expect((await t.call(null, 'POST', `/v1/goals/${made.id}/feedback`, { rating: 'satisfied' })).statusCode).toBe(404)
    expect((await asVisitor(`/v1/goals/${made.id}/feedback`, { rating: 'satisfied', text: 'Found a flat in two days' })).statusCode).toBe(204)
    expect(await listed()).toEqual([{ id: expect.any(String), text: 'Found a flat in two days', rating: 'satisfied', createdAt: expect.any(String) }])
  })
})

describe('the admin feedback list', () => {
  it('counts each face of the last 7 days', async () => {
    const ago = (h: number) => new Date(Date.now() - h * 3_600_000)
    await t.db.insert(feedback).values([
      { userId: t.ids.seeker, rating: 'satisfied', createdAt: ago(2) },
      { userId: t.ids.leaver, rating: 'satisfied', createdAt: ago(30) },
      { userId: t.ids.moderator, rating: 'bad', createdAt: ago(3) },
      { userId: t.ids.seeker, rating: 'bad', createdAt: ago(24 * 8) },
    ])
    const res = feedbackResponse.parse((await t.call('moderator', 'GET', '/v1/admin/feedback')).json())
    expect(res.facesThisWeek).toEqual({ satisfied: 2, good: 0, neutral: 0, bad: 1, unsatisfied: 0 })
  })
})
