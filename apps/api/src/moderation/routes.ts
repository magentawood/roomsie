import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { errorResponse, noContent, reportQueueResponse, reviewBody, type ReportQueueItem } from '@roomsie/contract'
import { requireUser, type AuthOptions } from '../auth'
import type { Tx } from '../db/client'
import { connectionRequests, listings, profiles, reports, users } from '../db/schema'
import { listingView, partsOf } from '../listings/read'
import { idParams } from '../params'
import { answersOf, cardView } from '../profiles/read'
import type { Storage } from '../storage'

/** A suspended person is signed out everywhere, and leaves the product until a developer ends the suspension (T-19). */
async function suspend(tx: Tx, userId: string) {
  const now = new Date()
  await tx.update(users).set({ status: 'suspended', tokensValidAfter: now }).where(eq(users.id, userId))
  await tx.update(profiles).set({ hiddenAt: now }).where(eq(profiles.userId, userId))
  await tx.update(listings).set({ hiddenAt: now }).where(eq(listings.ownerUserId, userId))
  const open = eq(connectionRequests.status, 'pending')
  await tx.update(connectionRequests).set({ status: 'withdrawn' }).where(and(eq(connectionRequests.fromUserId, userId), open))
  // The senders of the open requests to the person see "not available", as after a decline.
  await tx.update(connectionRequests).set({ status: 'declined', respondedAt: now }).where(and(eq(connectionRequests.toUserId, userId), open))
  await tx.update(reports).set({ status: 'actioned' }).where(and(eq(reports.subjectUserId, userId), eq(reports.status, 'open')))
}

export function moderationRoutes(v1: FastifyInstance, options: AuthOptions & { storage: Storage }) {
  const { db, storage, moderation } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  // Each other user gets 404, so the routes do not show.
  const preHandler = [requireUser(options), async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user!.moderator) return reply.code(404).send({ error: 'not found' })
  }]

  app.get('/admin/reports', { preHandler, schema: { response: { 200: reportQueueResponse } } }, async () => {
    const open = await db.select({ report: reports, listing: listings, profile: profiles }).from(reports)
      .leftJoin(listings, eq(listings.id, reports.listingId))
      .leftJoin(profiles, eq(profiles.userId, reports.subjectUserId))
      .where(eq(reports.status, 'open')).orderBy(asc(reports.createdAt))
    const parts = await partsOf(db, open.flatMap((r) => (r.listing ? [r.listing.id] : [])))
    // One item for each listing. The reports of a person, and of a listing that its owner deleted, go to the person.
    const items = new Map<string, ReportQueueItem>()
    for (const { report, listing, profile } of open) {
      const key = listing ? `listing:${listing.id}` : `person:${report.subjectUserId}`
      const item = items.get(key) ?? (listing
        ? { kind: 'listing' as const, listing: listingView(listing, parts(listing.id), storage, false), reports: [] }
        : {
            kind: 'person' as const, userId: report.subjectUserId, hidden: profile?.hiddenAt != null, reports: [],
            card: profile && cardView(profile, await answersOf(db, profile.id), storage),
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

  for (const kind of ['people', 'listings'] as const) {
    app.post(`/admin/${kind}/:id/review`, {
      preHandler,
      schema: { params: idParams, body: reviewBody, response: { 204: noContent, 404: errorResponse } },
    }, async (req, reply) => {
      const { id } = req.params
      const { action } = req.body
      const reviewed = await db.transaction(async (tx) => {
        const ofItem = kind === 'listings' ? eq(reports.listingId, id) : and(eq(reports.subjectUserId, id), isNull(reports.listingId))
        const closed = await tx.update(reports).set({ status: action === 'dismiss' ? 'dismissed' : 'actioned' })
          .where(and(ofItem, eq(reports.status, 'open'))).returning({ subjectUserId: reports.subjectUserId })
        if (!closed.length) return false
        const hiddenAt = action === 'dismiss' ? null : new Date()
        if (kind === 'listings') await tx.update(listings).set({ hiddenAt }).where(eq(listings.id, id))
        else await tx.update(profiles).set({ hiddenAt }).where(eq(profiles.userId, id))
        if (action === 'suspend') await suspend(tx, closed[0]!.subjectUserId)
        return true
      })
      if (!reviewed) return reply.code(404).send({ error: 'not found' })
      return reply.code(204).send(null)
    })
  }
}
