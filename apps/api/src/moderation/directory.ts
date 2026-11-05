import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import {
  adminListingResponse, adminListingsQuery, adminListingsResponse, adminPeopleQuery, adminPeopleResponse, adminPersonResponse, errorResponse, listingActionBody, noContent,
  personActionBody, reportReasons, type AdminListingRow, type AdminPersonRow,
} from '@roomsie/contract'
import { z } from 'zod'
import { listAreas } from '../areas'
import { requireModerator, type AuthOptions } from '../auth'
import type { Db, Tx } from '../db/client'
import { lastTypedTurns } from '../goals/store'
import { listingsByIds, listingView, newestListings, partsOf, rowTitle, setListingHiddenForReview, setListingRemoved, type Listing } from '../listings/read'
import { lastSentMessages } from '../messages/read'
import { idParams } from '../params'
import { answersOf, cardView, hiddenCardOwners, ownersNamed, profileOf, profilesOfUsers, setCardHiddenForReview } from '../profiles/read'
import { closeReports, openReportCounts, reportedIds, reportsAbout, type Subject } from '../reports/read'
import { firstPhotoUrl, type Storage } from '../storage'
import { accountsOf, emailsOf, newestAccounts } from '../users'
import { verifiedIds, verifiedUserIds } from '../verification/read'
import { logAction, logOf } from './log'
import { suspend } from './suspend'

const limit = 50
const unique = (ids: string[]) => [...new Set(ids)]
const latest = (times: (Date | null | undefined)[]) => times.reduce<Date | null>((a, b) => (b && (!a || b > a) ? b : a), null)

const reportsOf = async (db: Db, subject: Subject) =>
  (await reportsAbout(db, subject)).map((r) => ({ id: r.id, reason: z.enum(reportReasons).parse(r.reason), detail: r.detail, status: r.status, createdAt: r.createdAt.toISOString() }))

/** The rows of these people, in this order, without the deleted accounts. Never gender, religion or community. */
async function peopleRows(db: Db, storage: Storage, ids: string[]): Promise<AdminPersonRow[]> {
  const [accounts, cards, reports, verified, turns, sent] = await Promise.all([
    accountsOf(db, ids), profilesOfUsers(db, ids), openReportCounts(db, 'userId', ids), verifiedIds(db, ids.map((id) => ({ id, userId: id }))),
    lastTypedTurns(db, ids), lastSentMessages(db, ids),
  ])
  const accountOf = new Map(accounts.map((a) => [a.id, a]))
  const cardOf = new Map(cards.map((c) => [c.userId, c]))
  return ids.flatMap((id) => {
    const account = accountOf.get(id)
    if (!account || account.status === 'deleted') return []
    const card = cardOf.get(id)
    return [{
      userId: id, name: card?.fullName ?? null, email: account.email, photoUrl: card ? firstPhotoUrl(storage, card.photoKeys) : null,
      joinedAt: account.joinedAt.toISOString(), lastActiveAt: latest([account.lastSignInAt, turns.get(id), sent.get(id)])?.toISOString() ?? null,
      openReports: reports.get(id) ?? 0, hidden: card?.hiddenAt != null, suspended: account.status === 'suspended', verified: verified.has(id),
    }]
  })
}

async function listingRows(db: Db, rows: Listing[]): Promise<AdminListingRow[]> {
  const ids = rows.map((l) => l.id)
  const owners = unique(rows.map((l) => l.ownerUserId))
  const [areas, cards, emails, reports, parts] = await Promise.all([
    listAreas(db), profilesOfUsers(db, owners), emailsOf(db, owners), openReportCounts(db, 'listingId', ids), partsOf(db, ids),
  ])
  const areaName = new Map(areas.map((a) => [a.slug, a.name]))
  const now = new Date()
  return rows.map((l) => {
    const rents = parts(l.id).rates.flatMap((r) => (r.rent === null ? [] : [r.rent]))
    const expired = l.expiresAt !== null && l.expiresAt <= now
    return {
      id: l.id, title: rowTitle(l), area: l.areaSlug ? (areaName.get(l.areaSlug) ?? l.areaSlug) : null,
      lister: cards.find((c) => c.userId === l.ownerUserId && !c.managedByParent)?.fullName ?? null,
      listerEmail: emails.get(l.ownerUserId) ?? null, rent: rents.length ? Math.min(...rents) : null,
      postedAt: l.createdAt.toISOString(), openReports: reports.get(l.id) ?? 0,
      live: l.status === 'live' && !expired && !l.hiddenAt && !l.removedAt, hidden: l.hiddenAt !== null, removed: l.removedAt !== null, expired,
    }
  })
}

/** The newest accounts whose card name or sign-in email has the text. */
async function accountsMatching(db: Db, text: string) {
  const ids = unique([...(await ownersNamed(db, text, limit)).map((r) => r.userId), ...(await newestAccounts(db, limit, { email: text })).map((r) => r.id)])
  return (await accountsOf(db, ids)).sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime()).slice(0, limit).map((a) => a.id)
}

/** The people and the listings of the admin, and the actions of a moderator on them (T-63). */
export function directoryRoutes(v1: FastifyInstance, options: AuthOptions & { storage: Storage }) {
  const { db, storage } = options
  const app = v1.withTypeProvider<ZodTypeProvider>()
  const preHandler = requireModerator(options)

  app.get('/admin/people', { preHandler, schema: { querystring: adminPeopleQuery, response: { 200: adminPeopleResponse, 404: errorResponse } } }, async (req) => {
    const { q, filter } = req.query
    const ids = q ? await accountsMatching(db, q)
      : filter === 'reported' ? await reportedIds(db, 'userId', limit)
        : filter === 'hidden' ? (await hiddenCardOwners(db, limit)).map((r) => r.userId)
          : filter === 'verified' ? await verifiedUserIds(db, limit)
            : (await newestAccounts(db, limit, { suspended: filter === 'suspended' })).map((r) => r.id)
    return { people: await peopleRows(db, storage, ids) }
  })

  app.get('/admin/people/:id', { preHandler, schema: { params: idParams, response: { 200: adminPersonResponse, 404: errorResponse } } }, async (req, reply) => {
    const userId = req.params.id
    const [row] = await peopleRows(db, storage, [userId])
    if (!row) return reply.code(404).send({ error: 'not found' })
    const card = await profileOf(db, userId)
    const [answers, reports, log] = await Promise.all([card ? answersOf(db, card.id) : null, reportsOf(db, { userId }), logOf(db, { userId })])
    return { ...row, card: card && answers ? cardView(card, answers, storage) : null, visibility: card?.visibility ?? null, reports, log }
  })

  app.post('/admin/people/:id/actions', { preHandler, schema: { params: idParams, body: personActionBody, response: { 204: noContent, 404: errorResponse } } }, async (req, reply) => {
    const userId = req.params.id
    const { action } = req.body
    const done = await db.transaction(async (tx: Tx) => {
      // The lock keeps a deletion of the account from running between the check and the action.
      if (!(await accountsOf(tx, [userId]).for('update')).some((a) => a.status !== 'deleted')) return false
      if (action === 'suspend') await suspend(tx, userId)
      else if (!(await setCardHiddenForReview(tx, userId, action === 'hide' ? new Date() : null).returning()).length) return false
      await closeReports(tx, { userId }, action === 'unhide' ? 'dismissed' : 'actioned')
      await logAction(tx, req.user!.id, action, { userId })
      return true
    })
    return done ? reply.code(204).send(null) : reply.code(404).send({ error: 'not found' })
  })

  app.get('/admin/listings', { preHandler, schema: { querystring: adminListingsQuery, response: { 200: adminListingsResponse, 404: errorResponse } } }, async (req) => {
    const { q, filter } = req.query
    let rows: Listing[]
    if (q) {
      const text = q.toLowerCase()
      const areaSlugs = (await listAreas(db)).filter((a) => [a.slug, a.name, ...a.aliases].some((name) => name.toLowerCase().includes(text))).map((a) => a.slug)
      rows = await newestListings(db, limit, { match: { areaSlugs, ownerIds: await accountsMatching(db, q) } })
    } else if (filter === 'reported') {
      const ids = await reportedIds(db, 'listingId', limit)
      const byId = new Map((await listingsByIds(db, ids)).map((l) => [l.id, l]))
      rows = ids.flatMap((id) => byId.get(id) ?? [])
    } else rows = await newestListings(db, limit, { hidden: filter === 'hidden', removed: filter === 'removed' })
    return { listings: await listingRows(db, rows) }
  })

  app.get('/admin/listings/:id', { preHandler, schema: { params: idParams, response: { 200: adminListingResponse, 404: errorResponse } } }, async (req, reply) => {
    const listingId = req.params.id
    const [listing] = await listingsByIds(db, [listingId])
    if (!listing) return reply.code(404).send({ error: 'not found' })
    const [[row], parts, reports, log] = await Promise.all([listingRows(db, [listing]), partsOf(db, [listingId]), reportsOf(db, { listingId }), logOf(db, { listingId })])
    return { ...row!, listerUserId: listing.ownerUserId, listing: listingView(listing, parts(listingId), storage, false), reports, log }
  })

  app.post('/admin/listings/:id/actions', { preHandler, schema: { params: idParams, body: listingActionBody, response: { 204: noContent, 404: errorResponse } } }, async (req, reply) => {
    const listingId = req.params.id
    const { action } = req.body
    const done = await db.transaction(async (tx: Tx) => {
      // The lock keeps a delete of the listing from running between the check and the action.
      const [listing] = await listingsByIds(tx, [listingId]).for('update')
      if (!listing) return false
      if (action === 'remove') await setListingRemoved(tx, listingId, new Date())
      else await setListingHiddenForReview(tx, listingId, action === 'hide' ? new Date() : null)
      await closeReports(tx, { listingId }, action === 'unhide' ? 'dismissed' : 'actioned')
      await logAction(tx, req.user!.id, action, { userId: listing.ownerUserId, listingId })
      return true
    })
    return done ? reply.code(204).send(null) : reply.code(404).send({ error: 'not found' })
  })
}
