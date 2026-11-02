import { isIPv4 } from 'node:net'
import { and, count, eq, gt, or, sql } from 'drizzle-orm'
import { capWall, panelReady, type FormA, type LimitRefusal, type RateLimit } from '@roomsie/contract'
import type { Db } from '../db/client'
import { anonymousSessions, chatTurns, goals } from '../db/schema'
import type { LimitSettings } from './settings'
import { hashOf, ownedBy, type Asker, type Network } from './store'

export const limitLines = {
  turn_cap: `${capWall.title}. ${capWall.text}`,
  too_many_chats: 'Too many chats from this network today. Sign in, or come back tomorrow.',
  too_fast: "You're sending fast. Wait a moment, then send it again.",
} as const

/** The network around an address: the /24 of IPv4, or the /48 of IPv6. */
export function ipRangeOf(ip: string) {
  const address = ip.startsWith('::ffff:') && isIPv4(ip.slice(7)) ? ip.slice(7) : ip
  if (isIPv4(address)) return `${address.split('.').slice(0, 3).join('.')}.0/24`
  const [head = '', tail = ''] = address.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const groups = address.includes('::') ? [...left, ...Array<string>(8 - left.length - right.length).fill('0'), ...right] : left
  return `${groups.slice(0, 3).map((group) => parseInt(group, 16).toString(16)).join(':')}::/48`
}

/** The device and the network of a request, as hashes only (T-21). */
export const networkOf = ({ ip, userAgent }: { ip: string; userAgent: string }): Network =>
  ({ deviceHash: hashOf(`${ip}|${userAgent}`), ipHash: hashOf(ip), ipRangeHash: hashOf(ipRangeOf(ip)) })

/** The limit that a new visitor session goes over, or null (PD9). A day is the last 24 hours. */
export async function chatLimitOf(db: Db, network: Network, settings: LimitSettings): Promise<RateLimit | null> {
  const [row] = await db.select({
    device: sql<number>`count(*) filter (where ${anonymousSessions.deviceHash} = ${network.deviceHash})`.mapWith(Number),
    ip: sql<number>`count(*) filter (where ${anonymousSessions.ipHash} = ${network.ipHash})`.mapWith(Number),
    range: sql<number>`count(*) filter (where ${anonymousSessions.ipRangeHash} = ${network.ipRangeHash})`.mapWith(Number),
  }).from(anonymousSessions).where(and(
    gt(anonymousSessions.createdAt, sql`now() - interval '24 hours'`),
    or(eq(anonymousSessions.deviceHash, network.deviceHash), eq(anonymousSessions.ipRangeHash, network.ipRangeHash)),
  ))
  if (row!.device >= settings.sessionsPerDevice) return 'device'
  if (row!.ip >= settings.sessionsPerIp) return 'ip'
  if (row!.range >= settings.sessionsPerIpRange) return 'ip_range'
  return null
}

async function typedTurnsOf(db: Db, sessionId: string) {
  const [row] = await db.select({ turnCount: anonymousSessions.turnCount }).from(anonymousSessions).where(eq(anonymousSessions.id, sessionId))
  return row?.turnCount ?? 0
}

/** The typed turns before the wall can come: to the cap, or to the backstop when no results show past the cap. */
export async function typedTurnsLeft(db: Db, asker: Asker, form: FormA, settings: LimitSettings) {
  if (asker.userId || !asker.sessionId) return null
  const used = await typedTurnsOf(db, asker.sessionId)
  return Math.max(0, (used >= settings.turnCap && !panelReady(form) ? settings.turnBackstop : settings.turnCap) - used)
}

/** The limit that a typed turn goes over, or null. The cap waits for results, until the backstop (PD9, T-21). */
export async function turnLimitOf(db: Db, asker: Asker, form: FormA, settings: LimitSettings): Promise<LimitRefusal['limit'] | null> {
  if (!asker.userId && asker.sessionId) {
    const used = await typedTurnsOf(db, asker.sessionId)
    if (used >= settings.turnBackstop || (used >= settings.turnCap && panelReady(form))) return 'turn_cap'
  }
  const [row] = await db.select({ n: count() }).from(chatTurns).innerJoin(goals, eq(goals.id, chatTurns.goalId))
    .where(and(ownedBy(asker), eq(chatTurns.inputMethod, 'typed'), gt(chatTurns.createdAt, sql`now() - interval '1 minute'`)))
  return row!.n >= settings.typedTurnsPerMinute ? 'too_fast' : null
}
