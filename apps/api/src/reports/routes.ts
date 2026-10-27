import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, count, eq } from 'drizzle-orm'
import { errorResponse, noContent, reportBody } from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import { reports } from '../db/schema'
import { hideListingForReview, ownerOfVisibleListing } from '../listings/read'
import { hideCardForReview, ownerOfProfile } from '../profiles/read'
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
      const target = 'listingId' in body
        ? {
            subject: () => ownerOfVisibleListing(tx, body.listingId, reporterUserId).for('update'),
            reports: eq(reports.listingId, body.listingId),
            hide: () => hideListingForReview(tx, body.listingId),
          }
        : {
            subject: () => ownerOfProfile(tx, body.profileId, reporterUserId).for('update'),
            reports: eq(reports.profileId, body.profileId),
            hide: () => hideCardForReview(tx, body.profileId),
          }
      const [subject] = await target.subject()
      if (!subject) return false
      // ADR-0015: a retried tap, or a second report of the same user, files nothing.
      const filed = await tx.insert(reports).values({
        ...body, reporterUserId, subjectUserId: subject.userId, detail: body.detail && maskContacts(body.detail),
      }).onConflictDoNothing().returning({ id: reports.id })
      if (!filed.length) return true
      const [open] = await tx.select({ reporters: count() }).from(reports).where(and(target.reports, eq(reports.status, 'open')))
      // PD18: a safety report, or reports from this number of people, hide the listing or the card at once.
      if (moderation.safetyReasons.includes(body.reason) || open!.reporters >= moderation.hideAtReporters) await target.hide()
      return true
    })
    if (!found) return reply.code(404).send({ error: 'not found' })
    return reply.code(204).send(null)
  })
}
