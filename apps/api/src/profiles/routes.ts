import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, eq, inArray } from 'drizzle-orm'
import {
  childTypes, createProfileBody, errorResponse, personResponse, requestDailyLimit, profileEditBody, profileResponse, profileUploadUrlResponse,
  uploadUrlBody, type ProfileEditBody,
} from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import type { Tx } from '../db/client'
import { areas, profileLifestyle, profileMustHaves, profiles, users } from '../db/schema'
import { visiblePeople } from '../match/query'
import { idParams } from '../params'
import { deletePhotos, photoUploadLink, type Storage } from '../storage'
import { connectionWith, sentToday } from '../requests/read'
import { maskFields } from '../text/mask-contacts'
import { answersOf, cardView, missingFields, profileView, type Profile } from './read'

/** Each free-text field that the person writes (PD17). */
const maskedFields = ['fullName', 'bio', 'jobRole', 'commuteAddress'] as const
const noProfile = { ok: false, code: 404, error: 'no profile' } as const

export function profileRoutes(v1: FastifyInstance, options: AuthOptions & { storage: Storage }) {
  const { db, storage } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireUser(options)
  const ownProfile = async (userId: string) => (await db.select().from(profiles).where(eq(profiles.userId, userId)))[0]
  const ownProfileView = async (p: Profile) => profileView(p, await answersOf(db, p.id), storage)

  app.post('/me/profile', {
    preHandler,
    schema: { body: createProfileBody, response: { 201: profileResponse, 409: errorResponse } },
  }, async (req, reply) => {
    const [made] = await db.insert(profiles).values({ userId: req.user!.id, ...maskFields(req.body, ['fullName']) }).onConflictDoNothing().returning()
    if (!made) return reply.code(409).send({ error: 'the profile exists' })
    return reply.code(201).send(await ownProfileView(made))
  })

  app.get('/me/profile', { preHandler, schema: { response: { 200: profileResponse, 404: errorResponse } } }, async (req, reply) => {
    const p = await ownProfile(req.user!.id)
    return p ? ownProfileView(p) : reply.code(404).send({ error: 'no profile' })
  })

  app.patch('/me/profile', {
    preHandler,
    schema: { body: profileEditBody, response: { 200: profileResponse, 400: errorResponse, 404: errorResponse, 502: errorResponse } },
  }, async (req, reply) => {
    const { lifestyle, mustHaves, hidden, photoKeys, ...fields } = maskFields(req.body, maskedFields)
    if (fields.areas?.length) {
      const known = await db.select({ slug: areas.slug }).from(areas).where(inArray(areas.slug, fields.areas))
      if (known.length !== fields.areas.length) return reply.code(400).send({ error: 'not valid: areas' })
    }
    const result = await db.transaction(async (tx) => {
      // The deletion of an account (T-20) locks this row too, so a photo change cannot race it.
      const [user] = await tx.select({ status: users.status }).from(users).where(eq(users.id, req.user!.id)).for('update')
      if (user?.status !== 'active') return noProfile
      const [p] = await tx.select().from(profiles).where(eq(profiles.userId, req.user!.id)).for('update')
      if (!p) return noProfile
      const next: Profile = { ...p, ...fields, photoKeys: photoKeys ?? p.photoKeys }
      const invalid = crossFieldError(next, photoKeys)
      if (invalid) return { ok: false as const, code: 400 as const, error: `not valid: ${invalid}` }
      const removed = p.photoKeys.filter((key) => !next.photoKeys.includes(key))
      // PD19: a photo leaves R2 before its row. If R2 fails, the transaction changes nothing.
      if (!(await deletePhotos(storage, removed, req.log))) return { ok: false as const, code: 502 as const, error: 'photo storage failed' }
      const visibility = (hidden ?? p.visibility === 'hidden') ? 'hidden' : missingFields(next).length ? 'draft' : 'live'
      const [saved] = await tx.update(profiles).set({ ...fields, photoKeys: next.photoKeys, visibility, updatedAt: new Date() })
        .where(eq(profiles.id, p.id)).returning()
      await saveAnswers(tx, p.id, { lifestyle, mustHaves })
      return { ok: true as const, saved: saved! }
    })
    return result.ok ? ownProfileView(result.saved) : reply.code(result.code).send({ error: result.error })
  })

  app.post('/me/profile/upload-urls', {
    preHandler,
    schema: { body: uploadUrlBody, response: { 200: profileUploadUrlResponse, 404: errorResponse } },
  }, async (req, reply) => {
    const p = await ownProfile(req.user!.id)
    if (!p) return reply.code(404).send({ error: 'no profile' })
    return photoUploadLink(storage, 'profiles', p.id, req.body)
  })

  app.get('/people/:id', {
    preHandler,
    schema: { params: idParams, response: { 200: personResponse, 404: errorResponse } },
  }, async (req, reply) => {
    const [row] = await db.select({ profile: profiles }).from(profiles).innerJoin(users, eq(profiles.userId, users.id))
      .where(and(eq(profiles.id, req.params.id), ...visiblePeople(req.user!.id)))
    if (!row) return reply.code(404).send({ error: 'not found' })
    const viewerUserId = req.user!.id
    return {
      ...cardView(row.profile, await answersOf(db, row.profile.id), storage),
      connection: await connectionWith(db, viewerUserId, row.profile.userId),
      requestsLeftToday: Math.max(0, requestDailyLimit - await sentToday(db, viewerUserId)),
    }
  })
}

function crossFieldError(p: Profile, photoKeys: string[] | undefined): keyof ProfileEditBody | null {
  if (p.budgetMin !== null && p.budgetMax !== null && p.budgetMin > p.budgetMax) return 'budgetMax'
  // PD15: a parent gives the type of the son or daughter.
  if (p.managedByParent && !(childTypes as readonly string[]).includes(p.whosMoving) && p.whosMoving !== 'unclear') return 'whosMoving'
  if (photoKeys?.some((key) => !key.startsWith(`profiles/${p.id}/`))) return 'photoKeys'
  return null
}

/** A null answer clears it. Each saved answer is "stated", because it comes from the form. */
async function saveAnswers(tx: Tx, profileId: string, { lifestyle, mustHaves }: Pick<ProfileEditBody, 'lifestyle' | 'mustHaves'>) {
  for (const [axisKey, value] of Object.entries(lifestyle ?? {})) {
    const row = and(eq(profileLifestyle.profileId, profileId), eq(profileLifestyle.axisKey, axisKey))
    if (value === null) await tx.delete(profileLifestyle).where(row)
    else await tx.insert(profileLifestyle).values({ profileId, axisKey, value, source: 'stated' })
      .onConflictDoUpdate({ target: [profileLifestyle.profileId, profileLifestyle.axisKey], set: { value, source: 'stated', updatedAt: new Date() } })
  }
  for (const [mustHaveKey, weight] of Object.entries(mustHaves ?? {})) {
    const row = and(eq(profileMustHaves.profileId, profileId), eq(profileMustHaves.mustHaveKey, mustHaveKey))
    if (weight === null) await tx.delete(profileMustHaves).where(row)
    else await tx.insert(profileMustHaves).values({ profileId, mustHaveKey, weight, source: 'stated' })
      .onConflictDoUpdate({ target: [profileMustHaves.profileId, profileMustHaves.mustHaveKey], set: { weight, source: 'stated', updatedAt: new Date() } })
  }
}
