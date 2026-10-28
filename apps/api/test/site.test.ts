import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { adminQuotesResponse, siteResponse } from '@roomsie/contract'
import { quotes, siteDetails } from '../src/db/schema'
import { testApp, type TestApp } from './app'

let t: TestApp<'moderator' | 'seeker'>
beforeAll(async () => { t = await testApp(['moderator', 'seeker']) })
afterAll(() => t.close())
beforeEach(async () => {
  await t.db.delete(quotes)
  await t.db.delete(siteDetails)
})

const site = async () => siteResponse.parse((await t.call(null, 'GET', '/v1/site')).json())
const addQuote = (text: string, who: 'moderator' | 'seeker' = 'moderator', consent: unknown = true) =>
  t.call(who, 'POST', '/v1/admin/quotes', { text, name: 'Asha K.', consent })
/** Adds "Quote <from>" to "Quote <to>". A higher number is newer. */
const addQuotes = async (from: number, to: number) => {
  for (let i = from; i <= to; i++) {
    expect((await addQuote(`Quote ${i}`)).statusCode).toBe(204)
    await t.db.update(quotes).set({ createdAt: new Date(Date.now() - (100 - i) * 60_000) }).where(eq(quotes.text, `Quote ${i}`))
  }
}
const noDetails = { instagram: null, whatsapp: null, facebook: null, linkedin: null, contactEmail: null, orgNumber: null }

describe('the landing quotes', () => {
  it('show only when five exist, and then the five newest', async () => {
    await addQuotes(1, 4)
    expect((await site()).quotes).toEqual([])
    await addQuotes(5, 6)
    expect((await site()).quotes.map((q) => q.text)).toEqual(['Quote 6', 'Quote 5', 'Quote 4', 'Quote 3', 'Quote 2'])
    expect((await site()).quotes[0]).toMatchObject({ name: 'Asha K.' })
  })

  it('need the consent tick and a short text', async () => {
    expect((await addQuote('No tick', 'moderator', false)).statusCode).toBe(400)
    expect((await t.call('moderator', 'POST', '/v1/admin/quotes', { text: 'No tick', name: 'Asha K.' })).statusCode).toBe(400)
    expect((await addQuote('x'.repeat(201))).statusCode).toBe(400)
    expect((await addQuote('   ')).statusCode).toBe(400)
    expect(await t.db.select().from(quotes)).toHaveLength(0)
  })

  it('list newest first for a moderator, who can delete one', async () => {
    await addQuotes(1, 2)
    const listed = adminQuotesResponse.parse((await t.call('moderator', 'GET', '/v1/admin/quotes')).json()).quotes
    expect(listed.map((q) => q.text)).toEqual(['Quote 2', 'Quote 1'])
    expect((await t.call('moderator', 'DELETE', `/v1/admin/quotes/${listed[0]!.id}`)).statusCode).toBe(204)
    expect((await t.call('moderator', 'DELETE', `/v1/admin/quotes/${listed[0]!.id}`)).statusCode).toBe(204)
    expect((await t.db.select().from(quotes)).map((q) => q.text)).toEqual(['Quote 1'])
    expect((await t.db.select().from(quotes))[0]!.addedBy).toBe(t.ids.moderator)
  })
})

describe('the site details', () => {
  it('are all empty until a moderator sets them, and each null part stays empty', async () => {
    expect((await site()).details).toEqual(noDetails)
    const details = { ...noDetails, instagram: 'https://instagram.com/roomsie', contactEmail: 'hello@roomsie.in', orgNumber: 'U12345MH2026PTC000001' }
    expect((await t.call('moderator', 'PUT', '/v1/admin/site', details)).statusCode).toBe(204)
    expect((await site()).details).toEqual(details)
    expect((await t.call('moderator', 'PUT', '/v1/admin/site', { ...details, instagram: null })).statusCode).toBe(204)
    expect((await site()).details).toEqual({ ...details, instagram: null })
  })

  it('refuse a link that is not https and an email that is not valid', async () => {
    expect((await t.call('moderator', 'PUT', '/v1/admin/site', { ...noDetails, facebook: 'http://facebook.com/roomsie' })).statusCode).toBe(400)
    expect((await t.call('moderator', 'PUT', '/v1/admin/site', { ...noDetails, contactEmail: 'roomsie' })).statusCode).toBe(400)
    expect((await t.call('moderator', 'PUT', '/v1/admin/site', { instagram: null })).statusCode).toBe(400)
  })
})

describe('the admin routes of the site', () => {
  it('give 404 to a person who is not a moderator, and 401 to a guest', async () => {
    const quote = (await t.db.insert(quotes).values({ text: 'Kept', name: 'Asha K.' }).returning())[0]!
    expect((await addQuote('Hi', 'seeker')).statusCode).toBe(404)
    expect((await t.call('seeker', 'GET', '/v1/admin/quotes')).statusCode).toBe(404)
    expect((await t.call('seeker', 'DELETE', `/v1/admin/quotes/${quote.id}`)).statusCode).toBe(404)
    expect((await t.call('seeker', 'PUT', '/v1/admin/site', noDetails)).statusCode).toBe(404)
    expect((await t.call(null, 'GET', '/v1/admin/quotes')).statusCode).toBe(401)
    expect(await t.db.select().from(quotes)).toHaveLength(1)
  })
})
