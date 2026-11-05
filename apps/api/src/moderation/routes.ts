import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { adminHomeResponse, errorResponse, noContent, reportQueueResponse, reviewBody, type ReportQueueItem } from '@roomsie/contract'
import { requireModerator, requireRole, type AuthOptions } from '../auth'
import { listingsByIds, listingView, partsOf, setListingHiddenForReview } from '../listings/read'
import { idParams } from '../params'
import { answersFor, cardView, profileOf, profilesOfUsers, setCardHiddenForReview } from '../profiles/read'
import { closeReports, openReports } from '../reports/read'
import type { Storage } from '../storage'
import type { AiSources } from '../models/overview'
import { homeCards } from './home'
import { logAction } from './log'
import { suspend } from './suspend'

export function moderationRoutes(v1: FastifyInstance, options: AuthOptions & AiSources & { storage: Storage }) {
  const { db, storage, moderation } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireModerator(options)

  app.get('/admin/home', { preHandler: requireRole(options, 'moderator', 'reviewer'), schema: { response: { 200: adminHomeResponse, 404: errorResponse } } }, async (req) => ({
    cards: await homeCards(options, req.user!, req.log),
  }))

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
      const subject = kind === 'listings' ? { listingId: id } : { userId: id }
      const reviewed = await db.transaction(async (tx) => {
        const closed = await closeReports(tx, subject, action === 'dismiss' ? 'dismissed' : 'actioned')
        if (!closed.length) return false
        const wasHidden = kind === 'listings' ? (await listingsByIds(tx, [id]))[0]?.hiddenAt != null : (await profileOf(tx, id))?.hiddenAt != null
        const hiddenAt = action === 'dismiss' ? null : new Date()
        if (kind === 'listings') await setListingHiddenForReview(tx, id, hiddenAt)
        else await setCardHiddenForReview(tx, id, hiddenAt)
        // The suspend of a person covers the hide of the card.
        const by = req.user!.id
        if (action === 'dismiss') {
          if (wasHidden) await logAction(tx, by, 'unhide', subject)
        } else if (action === 'hide' || kind === 'listings') await logAction(tx, by, 'hide', subject)
        if (action === 'suspend') {
          const owner = closed[0]!.subjectUserId
          await suspend(tx, owner)
          await logAction(tx, by, 'suspend', { userId: owner })
        }
        return true
      })
      if (!reviewed) return reply.code(404).send({ error: 'not found' })
      return reply.code(204).send(null)
    })
  }
}
