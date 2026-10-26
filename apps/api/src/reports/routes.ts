import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, count, eq, isNull, ne } from 'drizzle-orm'
import { errorResponse, noContent, reportBody } from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import { listings, profiles, reports } from '../db/schema'
import { visibleListing } from '../listings/read'
import { maskContacts } from '../text/mask-contacts'

export function reportRoutes(v1: FastifyInstance, options: AuthOptions) {
  const { db, moderation } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireUser(options)

  app.post('/reports', {
    preHandler,
    schema: { body: reportBody, response: { 204: noContent, 404: errorResponse } },
  }, async (req, reply) => {
    const { body } = req
    const reporterUserId = req.user!.id
    const found = await db.transaction(async (tx) => {
      // The lock makes two reports at the same time count each other. A person can be reported in each state of the card,
      // so that the recipient of a request can report its sender.
      const [target] = 'listingId' in body
        ? await tx.select({ subjectUserId: listings.ownerUserId }).from(listings)
          .where(and(eq(listings.id, body.listingId), visibleListing(reporterUserId), ne(listings.ownerUserId, reporterUserId))).for('update')
        : await tx.select({ subjectUserId: profiles.userId }).from(profiles)
          .where(and(eq(profiles.id, body.profileId), ne(profiles.userId, reporterUserId))).for('update')
      if (!target) return false
      const [listingId, profileId] = 'listingId' in body ? [body.listingId, null] : [null, body.profileId]
      // ADR-0015: a retried tap, or a second report of the same user, files nothing.
      const filed = await tx.insert(reports).values({
        id: body.id, reporterUserId, subjectUserId: target.subjectUserId, listingId, profileId, reason: body.reason,
        detail: body.detail && maskContacts(body.detail),
      }).onConflictDoNothing().returning({ id: reports.id })
      if (!filed.length) return true
      const [open] = await tx.select({ reporters: count() }).from(reports)
        .where(and(listingId ? eq(reports.listingId, listingId) : eq(reports.profileId, profileId!), eq(reports.status, 'open')))
      // PD18: a safety report, or reports from this number of people, hide the listing or the card at once.
      if (moderation.safetyReasons.includes(body.reason) || open!.reporters >= moderation.hideAtReporters) {
        const now = new Date()
        if (listingId) await tx.update(listings).set({ hiddenAt: now }).where(and(eq(listings.id, listingId), isNull(listings.hiddenAt)))
        else await tx.update(profiles).set({ hiddenAt: now }).where(and(eq(profiles.id, profileId!), isNull(profiles.hiddenAt)))
      }
      return true
    })
    if (!found) return reply.code(404).send({ error: 'not found' })
    return reply.code(204).send(null)
  })
}
