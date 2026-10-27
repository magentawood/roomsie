import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, asc, eq, sql } from 'drizzle-orm'
import {
  checkUploadBody, checkUploadResponse, errorResponse, idCheckPhotosResponse, idCheckQueueResponse, noContent, reviewCheckBody, sendCheckBody,
  verificationResponse,
} from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import { profiles, users, verificationAudit, verifications } from '../db/schema'
import type { IdStore } from '../id-store'
import { idParams } from '../params'
import { firstPhotoUrl, photoUploadLink, type Storage } from '../storage'
import { blockingCheck, openCheck, verificationOf } from './read'

/** The ID check of PD8 (T-46): a person sends an ID photo and a live selfie, and a named reviewer approves or rejects. */
export function verificationRoutes(v1: FastifyInstance, options: AuthOptions & { storage: Storage; idStore: IdStore | null }) {
  const { db, storage, idStore } = options
  const { alerts } = v1
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireUser(options)
  // Each other user gets 404, so the routes do not show.
  const reviewerOnly = [preHandler, async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user!.reviewer) return reply.code(404).send({ error: 'not found' })
  }]
  const notSetUp = (reply: FastifyReply) => reply.code(503).send({ error: 'verification is not set up' })
  const checkExists = (reply: FastifyReply) => reply.code(409).send({ error: 'a check is in review or approved' })

  app.get('/me/verification', { preHandler, schema: { response: { 200: verificationResponse } } }, async (req) => verificationOf(db, req.user!.id))

  app.post('/me/verification/upload-urls', {
    preHandler, schema: { body: checkUploadBody, response: { 200: checkUploadResponse, 409: errorResponse, 503: errorResponse } },
  }, async (req, reply) => {
    if (!idStore) return notSetUp(reply)
    const userId = req.user!.id
    if ((await blockingCheck(db, userId)).length) return checkExists(reply)
    const [idPhoto, selfie] = await Promise.all([
      photoUploadLink(idStore, 'checks', userId, req.body.idPhoto), photoUploadLink(idStore, 'checks', userId, req.body.selfie),
    ])
    return { idPhoto, selfie }
  })

  app.post('/me/verification', {
    preHandler, schema: { body: sendCheckBody, response: { 201: verificationResponse, 400: errorResponse, 409: errorResponse, 503: errorResponse } },
  }, async (req, reply) => {
    if (!idStore) return notSetUp(reply)
    const userId = req.user!.id
    const { documentType, idPhotoKey, selfieKey } = req.body
    const mine = (key: string) => key.startsWith(`checks/${userId}/`)
    if (!mine(idPhotoKey) || !mine(selfieKey) || idPhotoKey === selfieKey) return reply.code(400).send({ error: 'not valid: idPhotoKey, selfieKey' })
    if ((await blockingCheck(db, userId)).length) return checkExists(reply)
    // The score only helps the reviewer, so a failure sends the check with no score (ADR-0020).
    const faceMatch = await idStore.faceMatch(selfieKey, idPhotoKey).catch((err: unknown) => {
      req.log.error({ err }, 'face match')
      return null
    })
    const sent = await db.transaction(async (tx) => {
      // The lock makes two sends at the same time one check.
      await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update')
      if ((await blockingCheck(tx, userId)).length) return false
      await tx.insert(verifications).values({ userId, documentType, idPhotoKey, selfieKey, faceMatch })
      return true
    })
    if (!sent) return checkExists(reply)
    return reply.code(201).send(await verificationOf(db, userId))
  })

  app.get('/admin/verifications', { preHandler: reviewerOnly, schema: { response: { 200: idCheckQueueResponse, 404: errorResponse } } }, async () => {
    const rows = await db.select({
      check: verifications,
      // The card of a son or daughter is not the person who sent the check (T-16a).
      profile: { fullName: profiles.fullName, photoKeys: profiles.photoKeys },
      earlierChecks: sql<number>`(select count(*)::int from ${verifications} as earlier
        where earlier.user_id = ${verifications.userId} and earlier.created_at < ${verifications.createdAt})`,
    }).from(verifications)
      .leftJoin(profiles, and(eq(profiles.userId, verifications.userId), eq(profiles.managedByParent, false)))
      .where(openCheck()).orderBy(asc(verifications.createdAt))
    return {
      checks: rows.map(({ check, profile, earlierChecks }) => ({
        id: check.id, name: profile?.fullName ?? null, photoUrl: profile ? firstPhotoUrl(storage, profile.photoKeys) : null,
        documentType: check.documentType, faceMatch: check.faceMatch, earlierChecks, sentAt: check.createdAt.toISOString(),
      })),
    }
  })

  // A POST, not a GET: each link is a view, and the audit log keeps it before the API gives the link.
  app.post('/admin/verifications/:id/photos', {
    preHandler: reviewerOnly, schema: { params: idParams, response: { 200: idCheckPhotosResponse, 404: errorResponse, 503: errorResponse } },
  }, async (req, reply) => {
    if (!idStore) return notSetUp(reply)
    const [check] = await db.select({ idPhotoKey: verifications.idPhotoKey, selfieKey: verifications.selfieKey }).from(verifications)
      .where(and(eq(verifications.id, req.params.id), openCheck()))
    if (!check?.idPhotoKey || !check.selfieKey) return reply.code(404).send({ error: 'not found' })
    await db.insert(verificationAudit).values({ verificationId: req.params.id, reviewerUserId: req.user!.id, action: 'view' })
    const [idPhoto, selfie] = await Promise.all([idStore.viewUrl(check.idPhotoKey), idStore.viewUrl(check.selfieKey)])
    return { idPhotoUrl: idPhoto.url, selfieUrl: selfie.url, expiresAt: idPhoto.expiresAt.toISOString() }
  })

  app.post('/admin/verifications/:id/review', {
    preHandler: reviewerOnly, schema: { params: idParams, body: reviewCheckBody, response: { 204: noContent, 404: errorResponse } },
  }, async (req, reply) => {
    const { id } = req.params
    const review = req.body
    const reviewed = await db.transaction(async (tx) => {
      const [check] = await tx.select({ userId: verifications.userId, idPhotoKey: verifications.idPhotoKey, selfieKey: verifications.selfieKey })
        .from(verifications).where(and(eq(verifications.id, id), openCheck())).for('update')
      if (!check) return null
      const rejected = review.action === 'reject' ? { reason: review.reason, note: review.note || null } : { reason: null, note: null }
      // PD8: we keep the result. The keys and the score go with the files.
      await tx.update(verifications).set({
        state: review.action === 'approve' ? 'verified' : 'rejected', ...rejected,
        idPhotoKey: null, selfieKey: null, faceMatch: null, reviewerUserId: req.user!.id, reviewedAt: new Date(),
      }).where(eq(verifications.id, id))
      await tx.insert(verificationAudit).values({ verificationId: id, reviewerUserId: req.user!.id, action: review.action })
      return check
    })
    if (!reviewed) return reply.code(404).send({ error: 'not found' })
    const keys = [reviewed.idPhotoKey, reviewed.selfieKey].filter((k) => k !== null)
    // A failed delete keeps the review: the lifecycle rule of the bucket deletes the files after 7 days.
    if (idStore && keys.length) await idStore.deleteObjects(keys).catch((err: unknown) => req.log.error({ err }, 'ID files delete'))
    alerts.verification(reviewed.userId, review.action === 'approve' ? 'verified' : 'rejected')
    return reply.code(204).send(null)
  })
}
