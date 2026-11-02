import { createHash, randomBytes } from 'node:crypto'
import { and, asc, desc, eq, gt, or, sql, type SQL } from 'drizzle-orm'
import { assistantParts, type AssistantParts, formA, type AssistantReply, type FormA, type TurnLabel, type TurnResponse } from '@roomsie/contract'
import type { Db, Tx } from '../db/client'
import { anonymousSessions, chatTurns, goals } from '../db/schema'

/** PD19: the chat of a visitor goes 30 days after the last visit. */
const sessionDays = 30
const hashOf = (value: string) => createHash('sha256').update(value).digest('hex')
const expiry = () => new Date(Date.now() + sessionDays * 86_400_000)

/** A new visitor session. The key goes to the browser one time, and the database keeps only its hash. */
export async function createVisitorSession(db: Db, device: { ip: string; userAgent: string }) {
  const key = randomBytes(32).toString('base64url')
  const [row] = await db.insert(anonymousSessions)
    .values({ keyHash: hashOf(key), deviceHash: hashOf(`${device.ip}|${device.userAgent}`), expiresAt: expiry() })
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
const ownedBy = ({ userId, sessionId }: Asker): SQL => or(
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

const turnFields = { id: chatTurns.id, role: chatTurns.role, text: chatTurns.text, createdAt: chatTurns.createdAt }
const toChatTurn = (turn: { id: string; role: 'user' | 'assistant'; text: string; createdAt: Date }) => ({ ...turn, createdAt: turn.createdAt.toISOString() })

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

/**
 * Saves the two turns and the new form, if nobody changed the goal since `seen`. A second turn at the same time
 * would otherwise replace the form of the first. Returns null when the goal changed.
 */
export async function saveTurn(db: Db, goal: { id: string; seen: Date; asker: Asker }, form: FormA, userTurn: { text: string; label: TurnLabel }, reply: AssistantReply) {
  return db.transaction(async (tx) => {
    const [changed] = await tx.update(goals).set({ form, updatedAt: new Date() })
      // A JS date has milliseconds, and the default of the column has microseconds.
      .where(and(eq(goals.id, goal.id), ownedBy(goal.asker), sql`date_trunc('milliseconds', ${goals.updatedAt}) = ${goal.seen.toISOString()}::timestamptz`)).returning({ id: goals.id })
    if (!changed) return null
    // now() is the same for the whole transaction. clock_timestamp() of a later statement puts the reply after the turn.
    const [userRow] = await tx.insert(chatTurns).values({ goalId: goal.id, role: 'user', inputMethod: 'typed', text: userTurn.text, parts: userTurn.label, createdAt: sql`clock_timestamp()` }).returning(turnFields)
    const [assistantTurn] = await tx.insert(chatTurns).values({ goalId: goal.id, role: 'assistant', text: reply.text, parts: reply.parts, createdAt: sql`clock_timestamp()` }).returning(turnFields)
    return [toChatTurn(userRow!), toChatTurn(assistantTurn!)] satisfies TurnResponse['turns']
  })
}

/** At account deletion. The cascades remove the chat turns, and the goals of a claimed visitor session. */
export async function deleteGoalsOf(tx: Tx, userId: string) {
  await tx.delete(goals).where(eq(goals.userId, userId))
  await tx.delete(anonymousSessions).where(eq(anonymousSessions.claimedByUserId, userId))
}
