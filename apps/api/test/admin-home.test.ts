import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { adminHomeResponse, feedbackResponse } from '@roomsie/contract'
import { feedback, invites, quotes, reports, siteDetails, verifications } from '../src/db/schema'
import { testApp, type TestApp } from './app'

type Who = 'moderator' | 'reviewer' | 'both' | 'seeker' | 'other'
let t: TestApp<Who>
const cards = {} as Record<'seeker' | 'other', string>
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000)
beforeAll(async () => {
  t = await testApp(['moderator', 'reviewer', 'both', 'seeker', 'other'], undefined, {
    MODERATOR_UIDS: 'uid-moderator,uid-both', REVIEWER_UIDS: 'uid-reviewer,uid-both',
  })
  cards.seeker = await t.liveCard('seeker', 'Rahul Verma')
  cards.other = await t.liveCard('other', 'Karan Shah')
})
afterAll(() => t.close())

const home = async (who: Who) => adminHomeResponse.parse((await t.call(who, 'GET', '/v1/admin/home')).json()).cards
const report = async (who: Who, target: { listingId: string } | { profileId: string }, reason: string, age: number) => {
  const id = uuidv7()
  expect((await t.call(who, 'POST', '/v1/reports', { id, ...target, reason })).statusCode).toBe(204)
  await t.db.update(reports).set({ createdAt: hoursAgo(age) }).where(eq(reports.id, id))
}
const check = (userId: string, age: number, state: 'in_review' | 'verified' = 'in_review') => t.db.insert(verifications).values({
  userId, documentType: 'passport', idPhotoKey: 'id/a', selfieKey: 'id/b', faceMatch: 98, state, createdAt: hoursAgo(age),
  ...(state === 'verified' && { reviewedAt: hoursAgo(age - 1), idPhotoKey: null, selfieKey: null }),
})

describe('the admin home', () => {
  it('is not found for a person with no admin role', async () => {
    expect((await t.call('seeker', 'GET', '/v1/admin/home')).statusCode).toBe(404)
    expect((await t.call(null, 'GET', '/v1/admin/home')).statusCode).toBe(401)
  })

  it('gives each person only the cards of their roles', async () => {
    expect((await home('moderator')).map((c) => c.subject)).toEqual(['moderation', 'site_content'])
    expect((await home('reviewer')).map((c) => c.subject)).toEqual(['id_checks'])
    expect((await home('both')).map((c) => c.subject)).toEqual(['moderation', 'id_checks', 'site_content'])
  })

  it('counts the open reports, and the late ones of PD18', async () => {
    const listingId = await t.liveListing()
    await report('seeker', { listingId }, 'broker_or_spam', 30)
    await report('other', { listingId }, 'fake', 2)
    await report('seeker', { profileId: cards.other }, 'harassment', 5)
    await report('other', { profileId: cards.seeker }, 'under_18', 1)
    await t.db.insert(feedback).values([
      { userId: t.ids.seeker, text: 'Nice', createdAt: hoursAgo(24) },
      { userId: t.ids.other, text: 'Old', createdAt: hoursAgo(24 * 8) },
    ])
    const [moderation] = await home('moderator')
    if (moderation?.subject !== 'moderation') throw new Error('no moderation card')
    expect(moderation).toMatchObject({ openReports: 4, lateSafety: 1, lateOther: 1, feedbackThisWeek: 1 })
    expect(Math.abs(Date.parse(moderation.oldestReportAt!) - hoursAgo(30).getTime())).toBeLessThan(60_000)
  })

  it('counts the ID checks that wait, the late ones of PD8, and the checks verified this week', async () => {
    await check(t.ids.seeker, 26)
    await check(t.ids.other, 3)
    await check(t.ids.moderator, 30, 'verified')
    await check(t.ids.both, 24 * 9, 'verified')
    const [idChecks] = await home('reviewer')
    if (idChecks?.subject !== 'id_checks') throw new Error('no ID checks card')
    expect(idChecks).toMatchObject({ waiting: 2, late: 1, verifiedThisWeek: 1 })
    expect(Math.abs(Date.parse(idChecks.oldestAt!) - hoursAgo(26).getTime())).toBeLessThan(60_000)
  })

  it('counts the invites, the quotes and the site details that are set', async () => {
    await t.db.insert(invites).values([{ email: 'a@example.com' }, { email: 'b@example.com' }])
    await t.db.insert(quotes).values({ text: 'Found a flatmate in two days.', name: 'Riya S.' })
    await t.db.insert(siteDetails).values({ contactEmail: 'hello@roomsie.in', instagram: 'https://instagram.com/roomsie.in' })
    const site = (await home('moderator')).find((c) => c.subject === 'site_content')
    // The test database opens roomsie to everyone, so the gate is not invite-only.
    expect(site).toEqual({ subject: 'site_content', invites: 2, inviteOnly: false, quotes: 1, detailsSet: 2 })
  })
})

describe('the admin feedback list', () => {
  it('counts each face of the last 7 days', async () => {
    await t.db.insert(feedback).values([
      { userId: t.ids.seeker, rating: 'satisfied', createdAt: hoursAgo(2) },
      { userId: t.ids.other, rating: 'satisfied', createdAt: hoursAgo(30) },
      { userId: t.ids.both, rating: 'bad', createdAt: hoursAgo(3) },
      { userId: t.ids.reviewer, rating: 'bad', createdAt: hoursAgo(24 * 8) },
    ])
    const res = feedbackResponse.parse((await t.call('moderator', 'GET', '/v1/admin/feedback')).json())
    expect(res.facesThisWeek).toEqual({ satisfied: 2, good: 0, neutral: 0, bad: 1, unsatisfied: 0 })
  })
})
