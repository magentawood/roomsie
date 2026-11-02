import { isIPv4 } from 'node:net'
import { z } from 'zod'
import { and, count, eq, gt, or, sql } from 'drizzle-orm'
import { capWall, panelReady, type FormA, type RateLimit } from '@roomsie/contract'
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
export function ipRangeOf(address: string) {
  if (isIPv4(address)) return `${address.split('.').slice(0, 3).join('.')}.0/24`
  const [head = '', tail = ''] = address.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const groups = [...left, ...Array<string>(8 - left.length - right.length).fill('0'), ...right]
  return `${groups.slice(0, 3).map((group) => parseInt(group, 16).toString(16)).join(':')}::/48`
}

const ipAddress = z.union([z.ipv4(), z.ipv6()])

/** The hashes of the device and the network of a request, or null for an address that is not an IP address. */
export function networkOf({ ip, userAgent }: { ip: string; userAgent: string }): Network | null {
  // The load balancer gives the address, but the header is still text from outside (api.md).
  const parsed = ipAddress.safeParse(ip.replace(/^::ffff:(?=\d+\.)/, ''))
  if (!parsed.success) return null
  const address = parsed.data
  return { deviceHash: hashOf(`${address}|${userAgent}`), ipHash: hashOf(address), ipRangeHash: hashOf(ipRangeOf(address)) }
}

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

/**
 * The typed turns of a visitor before the wall. 0: the next typed turn gets the wall. The cap waits for results, until the backstop (PD9).
 * Null: no count to show, for a signed-in person, or past the cap before results show (the user, T-21).
 */
export async function typedTurnsLeft(db: Db, asker: Asker, form: FormA, settings: LimitSettings) {
  if (asker.userId || !asker.sessionId) return null
  const [row] = await db.select({ used: anonymousSessions.turnCount }).from(anonymousSessions).where(eq(anonymousSessions.id, asker.sessionId))
  const used = row?.used ?? 0
  if (used >= settings.turnBackstop) return 0
  if (used < settings.turnCap) return settings.turnCap - used
  return panelReady(form) ? 0 : null
}

/** A person over the limit of typed turns in a minute, signed in or not. */
export async function tooFast(db: Db, asker: Asker, settings: LimitSettings) {
  const [row] = await db.select({ n: count() }).from(chatTurns).innerJoin(goals, eq(goals.id, chatTurns.goalId))
    .where(and(ownedBy(asker), eq(chatTurns.inputMethod, 'typed'), gt(chatTurns.createdAt, sql`now() - interval '1 minute'`)))
  return row!.n >= settings.typedTurnsPerMinute
}
