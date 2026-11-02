import { isIPv4 } from 'node:net'
import { z } from 'zod'
import { and, count, eq, gt, or, sql } from 'drizzle-orm'
import { capWall, formA, panelReady, type RateLimit } from '@roomsie/contract'
import type { Db } from '../db/client'
import { anonymousSessions, chatTurns, goals } from '../db/schema'
import type { LimitSettings } from './settings'
import { hashOf, ownedBy, type Asker, type Network } from './store'

export const limitLines = {
  turn_cap: `${capWall.title}. ${capWall.text}`,
  too_many_chats: 'Too many chats from this network today. Sign in, or come back tomorrow.',
  too_fast: "You're sending fast. Wait a moment, then send it again.",
} as const

// The load balancer gives the address, but the header is still text from outside (api.md).
export const ipAddress = z.string().transform((ip) => ip.replace(/^::ffff:(?=\d+\.)/, '')).pipe(z.union([z.ipv4(), z.ipv6()])).brand<'IpAddress'>()
type IpAddress = z.output<typeof ipAddress>

/** The network around an address: the /24 of IPv4, or the /48 of IPv6. */
export function ipRangeOf(address: IpAddress) {
  if (isIPv4(address)) return `${address.split('.').slice(0, 3).join('.')}.0/24`
  const [head = '', tail = ''] = address.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const groups = [...left, ...Array<string>(8 - left.length - right.length).fill('0'), ...right]
  return `${groups.slice(0, 3).map((group) => parseInt(group, 16).toString(16)).join(':')}::/48`
}

export function networkOf({ ip, userAgent }: { ip: string; userAgent: string }): Network | null {
  const { success, data: address } = ipAddress.safeParse(ip)
  if (!success) return null
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

/** Where a person is on the turn cap of PD9. `hidden`: past the cap before results show. `none`: a signed-in person. */
export type CapState = { state: 'counting'; left: number } | { state: 'hidden' } | { state: 'wall' } | { state: 'none' }

/** The cap waits until any goal of the visitor showed results, and stops at the backstop (PD9). */
export async function capStateOf(db: Db, asker: Asker, settings: LimitSettings): Promise<CapState> {
  if (asker.userId || !asker.sessionId) return { state: 'none' }
  const [row] = await db.select({ used: anonymousSessions.turnCount }).from(anonymousSessions).where(eq(anonymousSessions.id, asker.sessionId))
  const used = row?.used ?? 0
  if (used >= settings.turnBackstop) return { state: 'wall' }
  if (used < settings.turnCap) return { state: 'counting', left: settings.turnCap - used }
  const forms = await db.select({ form: goals.form }).from(goals).where(eq(goals.anonymousSessionId, asker.sessionId))
  return forms.some(({ form }) => panelReady(formA.parse(form))) ? { state: 'wall' } : { state: 'hidden' }
}

/** The count of the contract and the web: 0 at the wall, and none when hidden or signed in. */
export const typedTurnsLeft = (cap: CapState) => (cap.state === 'counting' ? cap.left : cap.state === 'wall' ? 0 : null)

/** A person over the limit of typed turns in a minute, signed in or not. */
export async function tooFast(db: Db, asker: Asker, settings: LimitSettings) {
  const [row] = await db.select({ n: count() }).from(chatTurns).innerJoin(goals, eq(goals.id, chatTurns.goalId))
    .where(and(ownedBy(asker), eq(chatTurns.inputMethod, 'typed'), gt(chatTurns.createdAt, sql`now() - interval '1 minute'`)))
  return row!.n >= settings.typedTurnsPerMinute
}
