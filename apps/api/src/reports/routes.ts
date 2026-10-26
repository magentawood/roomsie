import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, count, eq, isNull, ne } from 'drizzle-orm'
import { errorResponse, noContent, reportBody, type ReportReason } from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import { listings, reports } from '../db/schema'
import { visibleListing } from '../listings/read'
import { maskContacts } from '../text/mask-contacts'

/** PD18: one report with a safety reason, or reports from this number of people, hide a listing at once. */
const safetyReasons: readonly ReportReason[] = ['harassment', 'under_18']
const hideAtReporters = 2

export function reportRoutes(v1: FastifyInstance, options: AuthOptions) {
  const { db } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireUser(options)

  app.post('/reports', {
    preHandler,
    schema: { body: reportBody, response: { 204: noContent, 404: errorResponse } },
  }, async (req, reply) => {
    const { id, listingId, reason, detail } = req.body
    const reporterUserId = req.user!.id
    const found = await db.transaction(async (tx) => {
      // The lock makes two reports at the same time count each other.
      const [listing] = await tx.select({ ownerUserId: listings.ownerUserId }).from(listings)
        .where(and(eq(listings.id, listingId), visibleListing(), ne(listings.ownerUserId, reporterUserId))).for('update')
      if (!listing) return false
      // ADR-0015: a retried tap, or a second report of the same user, files nothing.
      const filed = await tx.insert(reports).values({
        id, reporterUserId, subjectUserId: listing.ownerUserId, listingId, reason, detail: detail && maskContacts(detail),
      }).onConflictDoNothing().returning({ id: reports.id })
      if (!filed.length) return true
      const [open] = await tx.select({ reporters: count() }).from(reports)
        .where(and(eq(reports.listingId, listingId), eq(reports.status, 'open')))
      if (safetyReasons.includes(reason) || open!.reporters >= hideAtReporters) {
        await tx.update(listings).set({ hiddenAt: new Date() }).where(and(eq(listings.id, listingId), isNull(listings.hiddenAt)))
      }
      return true
    })
    if (!found) return reply.code(404).send({ error: 'not found' })
    return reply.code(204).send(null)
  })
}
