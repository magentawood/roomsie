import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import {
  checkUploadResponse, idCheckPhotosResponse, idCheckQueueResponse, listingResponse, personResponse, verificationResponse,
  type ReviewCheckBody,
} from '@roomsie/contract'
import { verificationAudit, verifications } from '../src/db/schema'
import { testApp, type TestApp } from './app'

type Who = 'lister' | 'seeker' | 'reviewer' | 'moderator' | 'leaver'
let t: TestApp<Who>
let seekerCard: string
beforeAll(async () => {
  t = await testApp(['lister', 'seeker', 'reviewer', 'moderator', 'leaver'])
  seekerCard = await t.liveCard('seeker', 'Neha Iyer')
})
afterAll(() => t.close())
beforeEach(async () => {
  await t.db.delete(verifications)
  for (const list of [t.idStore.uploads, t.idStore.views, t.idStore.deleted, t.idStore.matches, t.mails, t.pushes]) list.length = 0
  t.idStore.face.score = 97
})

const photo = { contentType: 'image/jpeg', size: 200_000 }
const state = async (who: Who) => verificationResponse.parse((await t.call(who, 'GET', '/v1/me/verification')).json())
async function links(who: Who) {
  const res = await t.call(who, 'POST', '/v1/me/verification/upload-urls', { idPhoto: photo, selfie: photo })
  expect(res.statusCode).toBe(200)
  return checkUploadResponse.parse(res.json())
}
/** Gets the two links and sends the check. Gives the id of the check. */
async function sendCheck(who: Who, documentType = 'driving_licence') {
  const { idPhoto, selfie } = await links(who)
  const sent = await t.call(who, 'POST', '/v1/me/verification', { documentType, idPhotoKey: idPhoto.key, selfieKey: selfie.key })
  expect(sent.statusCode).toBe(201)
  const [check] = await t.db.select({ id: verifications.id }).from(verifications).where(eq(verifications.userId, t.ids[who]))
  return check!.id
}
const queue = async () => idCheckQueueResponse.parse((await t.call('reviewer', 'GET', '/v1/admin/verifications')).json()).checks
const review = (id: string, body: ReviewCheckBody, who: Who = 'reviewer') => t.call(who, 'POST', `/v1/admin/verifications/${id}/review`, body)
const audit = (id: string) => t.db.select({ action: verificationAudit.action, reviewer: verificationAudit.reviewerUserId })
  .from(verificationAudit).where(eq(verificationAudit.verificationId, id))
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)

describe('a check that a person sends', () => {
  it('starts with no check', async () => {
    expect(await state('seeker')).toEqual({ state: 'none', reason: null, note: null, sentAt: null, reviewedAt: null })
  })

  it('gives two upload links in the folder of the person', async () => {
    const { idPhoto, selfie } = await links('seeker')
    for (const link of [idPhoto, selfie]) expect(link.key.startsWith(`checks/${t.ids.seeker}/`)).toBe(true)
    expect(idPhoto.key).not.toBe(selfie.key)
    expect(t.idStore.uploads).toEqual([
      { key: idPhoto.key, contentType: 'image/jpeg', size: 200_000 },
      { key: selfie.key, contentType: 'image/jpeg', size: 200_000 },
    ])
  })

  it('goes into review, with the face match of the selfie and the ID photo', async () => {
    const { idPhoto, selfie } = await links('seeker')
    const sent = await t.call('seeker', 'POST', '/v1/me/verification', { documentType: 'passport', idPhotoKey: idPhoto.key, selfieKey: selfie.key })
    expect(sent.statusCode).toBe(201)
    expect(verificationResponse.parse(sent.json()).state).toBe('in_review')
    expect(t.idStore.matches).toEqual([{ selfieKey: selfie.key, idPhotoKey: idPhoto.key }])
    const [row] = await t.db.select().from(verifications).where(eq(verifications.userId, t.ids.seeker))
    expect(row).toMatchObject({ state: 'in_review', method: 'id_selfie', documentType: 'passport', faceMatch: 97 })
  })

  it('refuses the photos of a different person', async () => {
    const { idPhoto } = await links('lister')
    const { selfie } = await links('seeker')
    const sent = await t.call('seeker', 'POST', '/v1/me/verification', { documentType: 'passport', idPhotoKey: idPhoto.key, selfieKey: selfie.key })
    expect(sent.statusCode).toBe(400)
  })

  it('takes one check at a time, and none after an approval', async () => {
    const id = await sendCheck('seeker')
    expect((await t.call('seeker', 'POST', '/v1/me/verification/upload-urls', { idPhoto: photo, selfie: photo })).statusCode).toBe(409)
    expect((await review(id, { action: 'approve' })).statusCode).toBe(204)
    expect((await t.call('seeker', 'POST', '/v1/me/verification/upload-urls', { idPhoto: photo, selfie: photo })).statusCode).toBe(409)
  })

  it('keeps a check with no face-match score', async () => {
    t.idStore.face.score = null
    await sendCheck('seeker')
    expect((await queue())[0]!.faceMatch).toBeNull()
  })
})

describe('the review', () => {
  it('opens only for the reviewers, also not for a moderator', async () => {
    const id = await sendCheck('seeker')
    for (const who of ['seeker', 'moderator'] as const) {
      expect((await t.call(who, 'GET', '/v1/admin/verifications')).statusCode).toBe(404)
      expect((await t.call(who, 'POST', `/v1/admin/verifications/${id}/photos`)).statusCode).toBe(404)
      expect((await review(id, { action: 'approve' }, who)).statusCode).toBe(404)
    }
    expect((await t.call('reviewer', 'GET', '/v1/me')).json()).toMatchObject({ reviewer: true, moderator: false })
    expect((await t.call('moderator', 'GET', '/v1/me')).json()).toMatchObject({ reviewer: false, moderator: true })
  })

  it('lists the checks in review, oldest first, with the name and the score', async () => {
    const first = await sendCheck('lister', 'pan_card')
    const second = await sendCheck('seeker')
    await t.db.update(verifications).set({ createdAt: daysAgo(1) }).where(eq(verifications.id, first))
    const checks = await queue()
    expect(checks.map((c) => c.id)).toEqual([first, second])
    expect(checks[1]).toMatchObject({ name: 'Neha Iyer', documentType: 'driving_licence', faceMatch: 97, earlierChecks: 0 })
    expect(checks[0]).toMatchObject({ name: null, documentType: 'pan_card' })
  })

  it('gives photo links that last 5 minutes, and writes a view row for each', async () => {
    const id = await sendCheck('seeker')
    const res = await t.call('reviewer', 'POST', `/v1/admin/verifications/${id}/photos`)
    expect(res.statusCode).toBe(200)
    const links = idCheckPhotosResponse.parse(res.json())
    expect(links.idPhotoUrl).toContain('?get')
    expect(new Date(links.expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(300_000)
    await t.call('reviewer', 'POST', `/v1/admin/verifications/${id}/photos`)
    expect(await audit(id)).toEqual([{ action: 'view', reviewer: t.ids.reviewer }, { action: 'view', reviewer: t.ids.reviewer }])
  })

  it('approves: the badge shows, the files go, and the person gets an alert', async () => {
    const id = await sendCheck('seeker')
    const [files] = await t.db.select({ idPhotoKey: verifications.idPhotoKey, selfieKey: verifications.selfieKey }).from(verifications).where(eq(verifications.id, id))
    expect((await review(id, { action: 'approve' })).statusCode).toBe(204)

    expect(await state('seeker')).toMatchObject({ state: 'verified', reason: null })
    expect(t.idStore.deleted.sort()).toEqual([files!.idPhotoKey, files!.selfieKey].sort())
    const [row] = await t.db.select().from(verifications).where(eq(verifications.id, id))
    expect(row).toMatchObject({ idPhotoKey: null, selfieKey: null, faceMatch: null, reviewerUserId: t.ids.reviewer })
    expect(await audit(id)).toEqual([{ action: 'approve', reviewer: t.ids.reviewer }])
    expect(t.mails.map((m) => [m.to, m.subject])).toEqual([['seeker@example.com', 'You’re verified on roomsie']])
    expect(await queue()).toEqual([])

    const person = personResponse.parse((await t.call('lister', 'GET', `/v1/people/${seekerCard}`)).json())
    expect(person.verified).toBe(true)
  })

  it('shows the badge of the owner on a listing', async () => {
    const listingId = await t.liveListing()
    const view = async () => listingResponse.parse((await t.call('seeker', 'GET', `/v1/listings/${listingId}`)).json()).verified
    expect(await view()).toBe(false)
    expect((await review(await sendCheck('lister'), { action: 'approve' })).statusCode).toBe(204)
    expect(await view()).toBe(true)
  })

  it('rejects with a reason and a note, which only Settings shows, and the person can send again', async () => {
    const id = await sendCheck('seeker')
    expect((await review(id, { action: 'reject', reason: 'id_not_clear', note: 'The photo is cut off at the top.' })).statusCode).toBe(204)
    expect(await state('seeker')).toMatchObject({ state: 'rejected', reason: 'id_not_clear', note: 'The photo is cut off at the top.' })
    expect(t.idStore.deleted).toHaveLength(2)
    expect(await audit(id)).toEqual([{ action: 'reject', reviewer: t.ids.reviewer }])
    const [mail] = t.mails
    expect(mail!.subject).toBe('Your ID check needs a new photo')
    expect(mail!.text).not.toContain('cut off')
    expect(t.pushes.every((p) => !p.title.includes('cut off'))).toBe(true)

    await sendCheck('seeker')
    expect((await queue())[0]).toMatchObject({ earlierChecks: 1 })
  })

  it('needs a reason for a rejection, and a note of at most 200 characters', async () => {
    const id = await sendCheck('seeker')
    expect((await t.call('reviewer', 'POST', `/v1/admin/verifications/${id}/review`, { action: 'reject' })).statusCode).toBe(400)
    expect((await review(id, { action: 'reject', reason: 'no_match', note: 'x'.repeat(201) })).statusCode).toBe(400)
  })

  it('reviews a check one time only', async () => {
    const id = await sendCheck('seeker')
    expect((await review(id, { action: 'approve' })).statusCode).toBe(204)
    expect((await review(id, { action: 'reject', reason: 'no_match' })).statusCode).toBe(404)
    expect((await t.call('reviewer', 'POST', `/v1/admin/verifications/${id}/photos`)).statusCode).toBe(404)
  })

  it('records the review when a file delete fails', async () => {
    const id = await sendCheck('seeker')
    await t.db.update(verifications).set({ idPhotoKey: `checks/${t.ids.seeker}/stuck.jpg` }).where(eq(verifications.id, id))
    expect((await review(id, { action: 'approve' })).statusCode).toBe(204)
    expect(await state('seeker')).toMatchObject({ state: 'verified' })
  })
})

describe('a check with no review after 7 days', () => {
  it('expires: it leaves the queue, cannot be reviewed, and the person can send again', async () => {
    const id = await sendCheck('seeker')
    await t.db.update(verifications).set({ createdAt: daysAgo(8) }).where(eq(verifications.id, id))
    expect(await state('seeker')).toMatchObject({ state: 'expired' })
    expect(await queue()).toEqual([])
    expect((await t.call('reviewer', 'POST', `/v1/admin/verifications/${id}/photos`)).statusCode).toBe(404)
    expect((await review(id, { action: 'approve' })).statusCode).toBe(404)
    await sendCheck('seeker')
    expect(await state('seeker')).toMatchObject({ state: 'in_review' })
  })
})

describe('account deletion', () => {
  it('deletes the checks, their audit rows and their files', async () => {
    const id = await sendCheck('leaver')
    await t.call('reviewer', 'POST', `/v1/admin/verifications/${id}/photos`)
    const [files] = await t.db.select({ idPhotoKey: verifications.idPhotoKey, selfieKey: verifications.selfieKey }).from(verifications).where(eq(verifications.id, id))
    expect((await t.call('leaver', 'DELETE', '/v1/me')).statusCode).toBe(204)
    expect(t.idStore.deleted.sort()).toEqual([files!.idPhotoKey, files!.selfieKey].sort())
    expect(await t.db.select().from(verifications).where(eq(verifications.id, id))).toEqual([])
    expect(await audit(id)).toEqual([])
  })
})
