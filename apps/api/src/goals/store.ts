import { createHash, randomBytes } from 'node:crypto'
import { and, asc, desc, eq, gt, isNotNull, or, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { assistantParts, type AssistantParts, chipTurnParts, type ChipTurnParts, formA, type AssistantReply, type FormA, type OwnValues, turnLabel, type TurnResponse, userTurnParts, type UserTurnParts } from '@roomsie/contract'
import type { Db, Tx } from '../db/client'
import { anonymousSessions, chatTurns, goals } from '../db/schema'
import { saveOwnValues } from '../profiles/own-values'

/** PD19: the chat of a visitor goes 30 days after the last visit. */
const sessionDays = 30
export const hashOf = (value: string) => createHash('sha256').update(value).digest('hex')
const expiry = () => new Date(Date.now() + sessionDays * 86_400_000)

/** The device and the network of a request, as hashes only (T-21). */
export type Network = { deviceHash: string; ipHash: string; ipRangeHash: string }

/** A new visitor session. The key goes to the browser one time, and the database keeps only its hash. */
export async function createVisitorSession(db: Db, network: Network) {
  const key = randomBytes(32).toString('base64url')
  const [row] = await db.insert(anonymousSessions)
    .values({ keyHash: hashOf(key), ...network, expiresAt: expiry() })
    .returning({ id: anonymousSessions.id })
  return { id: row!.id, key }
}

/** The session of a visitor key that has not expired. Each visit moves the expiry on. */
export async function visitorSessionOf(db: Db, key: string) {
  const [row] = await db.update(anonymousSessions).set({ lastSeenAt: new Date(), expiresAt: expiry() })
    .where(and(eq(anonymousSessions.keyHash, hashOf(key)), gt(anonymousSessions.expiresAt, sql`now()`)))
    .returning({ id: anonymousSessions.id })
  return row?.id ?? null
}

/** Who asks: a signed-in person, a visitor session, or both before T-17 moves the goals of the session. */
export type Asker = { userId: string | null; sessionId: string | null }
export const ownedBy = ({ userId, sessionId }: Asker): SQL => or(
  userId ? eq(goals.userId, userId) : sql`false`,
  sessionId ? eq(goals.anonymousSessionId, sessionId) : sql`false`,
)!

/** A signed-in person owns the goal, else the visitor session. */
export async function createGoal(db: Db, asker: Asker) {
  const [row] = await db.insert(goals)
    .values(asker.userId ? { userId: asker.userId } : { anonymousSessionId: asker.sessionId! })
    .returning({ id: goals.id })
  return row!.id
}

export async function goalOf(db: Db, id: string, asker: Asker) {
  const [row] = await db.select({ id: goals.id, form: goals.form, updatedAt: goals.updatedAt }).from(goals).where(and(eq(goals.id, id), ownedBy(asker)))
  return row && { ...row, form: formA.parse(row.form) }
}

const turnFields = { id: chatTurns.id, role: chatTurns.role, text: chatTurns.text, parts: chatTurns.parts, createdAt: chatTurns.createdAt }
/** The chips of an assistant turn go out. The label of a typed turn never does. */
const toChatTurn = ({ parts, ...turn }: { id: string; role: 'user' | 'assistant'; text: string; parts: unknown; createdAt: Date }) =>
  ({ ...turn, chips: turn.role === 'assistant' ? assistantParts.parse(parts).chips : null, createdAt: turn.createdAt.toISOString() })

export async function turnsOf(db: Db, goalId: string) {
  const rows = await db.select(turnFields).from(chatTurns).where(eq(chatTurns.goalId, goalId)).orderBy(asc(chatTurns.createdAt))
  return rows.map(toChatTurn)
}

/** The parts of the last reply of the assistant, with its text as the question when the parts have none. */
export async function lastReplyOf(db: Db, goalId: string): Promise<AssistantParts | null> {
  const [last] = await db.select({ text: chatTurns.text, parts: chatTurns.parts }).from(chatTurns)
    .where(and(eq(chatTurns.goalId, goalId), eq(chatTurns.role, 'assistant'))).orderBy(desc(chatTurns.createdAt)).limit(1)
  if (!last) return null
  // Only saveTurn writes an assistant turn, and no row is older than this schema: T-12 is the first code that writes parts.
  const parts = assistantParts.parse(last.parts)
  return { ...parts, question: parts.question ?? last.text }
}

/** The last two turns of a goal: what the composer reads of the chat, never the full chat (PD7a). */
export async function recentTurnsOf(db: Db, goalId: string) {
  const rows = await db.select({ role: chatTurns.role, text: chatTurns.text }).from(chatTurns)
    .where(eq(chatTurns.goalId, goalId)).orderBy(desc(chatTurns.createdAt)).limit(2)
  return rows.reverse()
}

// A typed turn from before the router (T-34) has no register.
const withRegister = z.object({ register: turnLabel.shape.register })
/** The register of the last typed turn of a goal. Null: no typed turn, or no register on it. */
export async function lastRegisterOf(db: Db, goalId: string) {
  const [row] = await db.select({ parts: chatTurns.parts }).from(chatTurns)
    .where(and(eq(chatTurns.goalId, goalId), eq(chatTurns.role, 'user'), eq(chatTurns.inputMethod, 'typed')))
    .orderBy(desc(chatTurns.createdAt)).limit(1)
  return (row && withRegister.safeParse(row.parts).data?.register) ?? null
}

export type UserTurn = { text: string; ownValues: OwnValues } & ({ inputMethod: 'typed'; parts: UserTurnParts } | { inputMethod: 'chip'; parts: ChipTurnParts })

/**
 * Saves the two turns and the new form, if nobody changed the goal since `seen`. A second turn at the same time
 * would otherwise replace the form of the first. Returns null when the goal changed.
 */
export async function saveTurn(db: Db, goal: { id: string; seen: Date; asker: Asker }, form: FormA, userTurn: UserTurn, reply: AssistantReply) {
  return db.transaction(async (tx) => {
    const { religion, community } = userTurn.ownValues
    const now = new Date()
    const own = { ...(religion && { ownReligion: religion, ownReligionAt: now }), ...(community && { ownCommunity: community, ownCommunityAt: now }) }
    const [changed] = await tx.update(goals).set({ form, ...own, updatedAt: now })
      // A JS date has milliseconds, and the default of the column has microseconds.
      .where(and(eq(goals.id, goal.id), ownedBy(goal.asker), sql`date_trunc('milliseconds', ${goals.updatedAt}) = ${goal.seen.toISOString()}::timestamptz`)).returning({ id: goals.id })
    if (!changed) return null
    if (goal.asker.userId) await saveOwnValues(tx, goal.asker.userId, userTurn.ownValues)
    else if (goal.asker.sessionId && userTurn.inputMethod === 'typed') {
      await tx.update(anonymousSessions).set({ turnCount: sql`${anonymousSessions.turnCount} + 1` }).where(eq(anonymousSessions.id, goal.asker.sessionId))
    }
    // now() is the same for the whole transaction. clock_timestamp() of a later statement puts the reply after the turn.
    const parts = userTurn.inputMethod === 'typed' ? userTurnParts.parse(userTurn.parts) : chipTurnParts.parse(userTurn.parts)
    const [userRow] = await tx.insert(chatTurns).values({ goalId: goal.id, role: 'user', inputMethod: userTurn.inputMethod, text: userTurn.text, parts, createdAt: sql`clock_timestamp()` }).returning(turnFields)
    const [assistantTurn] = await tx.insert(chatTurns).values({ goalId: goal.id, role: 'assistant', text: reply.text, parts: reply.parts, createdAt: sql`clock_timestamp()` }).returning(turnFields)
    return [toChatTurn(userRow!), toChatTurn(assistantTurn!)] satisfies TurnResponse['turns']
  })
}

/** At account deletion. The cascades remove the chat turns, and the goals of a claimed visitor session. */
export async function deleteGoalsOf(tx: Tx, userId: string) {
  await tx.delete(goals).where(eq(goals.userId, userId))
  await tx.delete(anonymousSessions).where(eq(anonymousSessions.claimedByUserId, userId))
}

/** The latest religion and community that the person stated in a chat, for a new profile (PD3c, T-58). */
export async function ownValuesOf(db: Db, userId: string): Promise<OwnValues> {
  const mine = eq(goals.userId, userId)
  const [[religion], [community]] = await Promise.all([
    db.select({ value: goals.ownReligion }).from(goals).where(and(mine, isNotNull(goals.ownReligion))).orderBy(desc(goals.ownReligionAt)).limit(1),
    db.select({ value: goals.ownCommunity }).from(goals).where(and(mine, isNotNull(goals.ownCommunity))).orderBy(desc(goals.ownCommunityAt)).limit(1),
  ])
  return { religion: religion?.value ?? null, community: community?.value ?? null }
}
