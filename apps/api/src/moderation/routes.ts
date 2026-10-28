import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { errorResponse, noContent, reportQueueResponse, reviewBody, type ReportQueueItem } from '@roomsie/contract'
import { requireModerator, type AuthOptions } from '../auth'
import type { Tx } from '../db/client'
import { hideListingsOf, listingsByIds, listingView, partsOf, setListingHiddenForReview } from '../listings/read'
import { idParams } from '../params'
import { answersFor, cardView, profilesOfUsers, setCardHiddenForReview } from '../profiles/read'
import { actionReportsAbout, closeReports, openReports } from '../reports/read'
import { endOpenRequests } from '../requests/read'
import type { Storage } from '../storage'
import { suspendAccount } from '../users'

/** A suspended person is signed out everywhere, and leaves the product until a developer ends the suspension (T-19). */
async function suspend(tx: Tx, userId: string) {
  const now = new Date()
  await suspendAccount(tx, userId, now)
  await setCardHiddenForReview(tx, userId, now)
  await hideListingsOf(tx, userId, now)
  await endOpenRequests(tx, userId)
  await actionReportsAbout(tx, userId)
}

export function moderationRoutes(v1: FastifyInstance, options: AuthOptions & { storage: Storage }) {
  const { db, storage, moderation } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireModerator(options)

  app.get('/admin/reports', { preHandler, schema: { response: { 200: reportQueueResponse, 404: errorResponse } } }, async () => {
    const reports = await openReports(db)
    const [listings, profiles] = await Promise.all([
      listingsByIds(db, reports.flatMap((r) => (r.listingId ? [r.listingId] : []))),
      profilesOfUsers(db, reports.map((r) => r.subjectUserId)),
    ])
    const listingOf = new Map(listings.map((l) => [l.id, l]))
    const profileOf = new Map(profiles.map((p) => [p.userId, p]))
    const parts = await partsOf(db, listings.map((l) => l.id))
    const answers = await answersFor(db, profiles.map((p) => p.id))
    // One item for each listing. The reports of a person, and of a listing that its owner deleted, go to the person.
    const items = new Map<string, ReportQueueItem>()
    for (const report of reports) {
      const listing = report.listingId ? listingOf.get(report.listingId) : undefined
      const profile = profileOf.get(report.subjectUserId) ?? null
      const key = listing ? `listing:${listing.id}` : `person:${report.subjectUserId}`
      const item = items.get(key) ?? (listing
        ? { kind: 'listing' as const, listing: listingView(listing, parts(listing.id), storage, false), reports: [] }
        : {
            kind: 'person' as const, userId: report.subjectUserId, hiddenForReview: profile?.hiddenAt != null, reports: [],
            card: profile && cardView(profile, answers(profile.id), storage),
          })
      item.reports.push({
        id: report.id, reason: report.reason, safety: moderation.safetyReasons.includes(report.reason), detail: report.detail,
        createdAt: report.createdAt.toISOString(),
      })
      items.set(key, item)
    }
    const safety = (item: ReportQueueItem) => item.reports.some((r) => r.safety)
    // The reports come oldest first, so the first report of an item is its oldest.
    return {
      items: [...items.values()].sort((a, b) => Number(safety(b)) - Number(safety(a)) || a.reports[0]!.createdAt.localeCompare(b.reports[0]!.createdAt)),
    }
  })

  for (const kind of ['users', 'listings'] as const) {
    app.post(`/admin/${kind}/:id/review`, {
      preHandler,
      schema: { params: idParams, body: reviewBody, response: { 204: noContent, 404: errorResponse } },
    }, async (req, reply) => {
      const { id } = req.params
      const { action } = req.body
      const reviewed = await db.transaction(async (tx) => {
        const closed = await closeReports(tx, kind === 'listings' ? { listingId: id } : { userId: id }, action === 'dismiss' ? 'dismissed' : 'actioned')
        if (!closed.length) return false
        const hiddenAt = action === 'dismiss' ? null : new Date()
        if (kind === 'listings') await setListingHiddenForReview(tx, id, hiddenAt)
        else await setCardHiddenForReview(tx, id, hiddenAt)
        if (action === 'suspend') await suspend(tx, closed[0]!.subjectUserId)
        return true
      })
      if (!reviewed) return reply.code(404).send({ error: 'not found' })
      return reply.code(204).send(null)
    })
  }
}
