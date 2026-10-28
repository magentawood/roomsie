import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { feedbackResponse } from '@roomsie/contract'
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
    for (let i = 1; i <= 101; i++) {
      const [row] = await t.db.insert(feedback).values({ userId: t.ids.seeker, text: `Note ${i}` }).returning()
      await t.db.update(feedback).set({ createdAt: new Date(Date.now() - (101 - i) * 1000) }).where(eq(feedback.id, row!.id))
    }
    const items = await listed()
    expect(items).toHaveLength(100)
    expect(items[0]).toEqual({ id: expect.any(String), text: 'Note 101', createdAt: expect.any(String) })
    expect(items.at(-1)!.text).toBe('Note 2')
    expect((await t.call('seeker', 'GET', '/v1/admin/feedback')).statusCode).toBe(404)
    expect((await t.call(null, 'GET', '/v1/admin/feedback')).statusCode).toBe(401)
  })

  it('goes when its person deletes the account', async () => {
    expect((await send('leaver', 'Bye')).statusCode).toBe(204)
    expect((await send('seeker', 'Stay')).statusCode).toBe(204)
    expect((await t.call('leaver', 'DELETE', '/v1/me')).statusCode).toBe(204)
    expect((await t.db.select().from(feedback)).map((f) => f.text)).toEqual(['Stay'])
  })
})
