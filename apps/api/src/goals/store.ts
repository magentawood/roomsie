import { createHash, randomBytes } from 'node:crypto'
import { and, asc, desc, eq, gt, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { assistantParts, type AssistantParts, chipTurnParts, type ChipTurnParts, formA, type AssistantReply, type FormA, type OwnValues, statesHiddenPreference, turnLabel, type TurnResponse, userTurnParts, type UserTurnParts, type WaitlistPlace } from '@roomsie/contract'
import type { Db, Tx } from '../db/client'
import { anonymousSessions, chatTurns, goals } from '../db/schema'
import { moveObservations, type Owner } from '../observations/read'
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

/** A signed-in person owns a goal or a Form B note, else the visitor session. */
export const ownerOf = (asker: Asker): Owner => (asker.userId ? { userId: asker.userId } : { anonymousSessionId: asker.sessionId! })

/** A new goal. A goal of the onboarding (T-48) has its Form A and the first line of the assistant. */
export function createGoal(db: Db, asker: Asker, start?: { form: FormA; reply: AssistantReply }) {
  return db.transaction(async (tx) => {
    const [goal] = await tx.insert(goals).values({ ...ownerOf(asker), ...(start && { form: start.form }) }).returning({ id: goals.id })
    const turns = start ? await tx.insert(chatTurns).values({ goalId: goal!.id, role: 'assistant', text: start.reply.text, parts: start.reply.parts }).returning(turnFields) : []
    return { id: goal!.id, turns: turns.map(toChatTurn) }
  })
}

export async function goalOf(db: Db, id: string, asker: Asker) {
  const [row] = await db.select({ id: goals.id, form: goals.form, outsidePlaces: goals.outsidePlaces, updatedAt: goals.updatedAt }).from(goals).where(and(eq(goals.id, id), ownedBy(asker)))
  return row && { ...row, form: formA.parse(row.form) }
}

const turnFields = { id: chatTurns.id, role: chatTurns.role, text: chatTurns.text, parts: chatTurns.parts, createdAt: chatTurns.createdAt }
/** The chips and the comparison of an assistant turn go out. The label of a typed turn never does. */
const toChatTurn = ({ parts, ...turn }: { id: string; role: 'user' | 'assistant'; text: string; parts: unknown; createdAt: Date }) => {
  const { chips, comparison } = turn.role === 'assistant' ? assistantParts.parse(parts) : { chips: null, comparison: null }
  return { ...turn, chips, comparison, createdAt: turn.createdAt.toISOString() }
}

export async function turnsOf(db: Db, goalId: string) {
  const rows = await db.select(turnFields).from(chatTurns).where(eq(chatTurns.goalId, goalId)).orderBy(asc(chatTurns.createdAt))
  return rows.map(toChatTurn)
}

/** The parts of the last reply of the assistant, with its text as the question when the parts have none. */
export async function lastReplyOf(db: Db, goalId: string): Promise<AssistantParts | null> {
  const [last] = await db.select({ text: chatTurns.text, parts: chatTurns.parts }).from(chatTurns)
    .where(and(eq(chatTurns.goalId, goalId), eq(chatTurns.role, 'assistant'))).orderBy(desc(chatTurns.createdAt)).limit(1)
  if (!last) return null
  // Only saveTurn and createGoal write assistant turns, each with parts (T-12).
  const parts = assistantParts.parse(last.parts)
  return { ...parts, question: parts.question ?? last.text }
}

/** The last two turns of a goal: what the composer reads of the chat, never the full chat (PD7a). A turn that states a hidden preference stays out (PD3c). */
export async function recentTurnsOf(db: Db, goalId: string) {
  const rows = await db.select({ role: chatTurns.role, text: chatTurns.text, parts: chatTurns.parts }).from(chatTurns)
    .where(eq(chatTurns.goalId, goalId)).orderBy(desc(chatTurns.createdAt)).limit(2)
  // Only a typed turn passes userTurnParts.
  const hides = (parts: unknown) => { const typed = userTurnParts.safeParse(parts); return typed.success && statesHiddenPreference(typed.data) }
  return rows.reverse().filter(({ parts }) => !hides(parts)).map(({ role, text }) => ({ role, text }))
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
export async function saveTurn(db: Db, goal: { id: string; seen: Date; asker: Asker }, changes: { form: FormA; outsidePlaces: WaitlistPlace[] }, userTurn: UserTurn, reply: AssistantReply) {
  return db.transaction(async (tx) => {
    const { religion, community } = userTurn.ownValues
    const now = new Date()
    const own = { ...(religion && { ownReligion: religion, ownReligionAt: now }), ...(community && { ownCommunity: community, ownCommunityAt: now }) }
    const [changed] = await tx.update(goals).set({ ...changes, ...own, updatedAt: now })
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

/** At account deletion. The cascades remove the chat turns, the waitlist entries of the chats, and the goals of a claimed visitor session. */
/** A deleted person is "Deleted user" in each comparison of people that other people keep (PD19, T-49). */
export async function forgetInComparisons(tx: Tx, profileId: string) {
  const deleted = { id: profileId, fullName: 'Deleted user', age: null, jobRole: null, whosMoving: 'unclear', budgetMin: null, budgetMax: null, moveDate: null, lifestyle: {}, verified: false }
  await tx.update(chatTurns).set({
    parts: sql`jsonb_set(${chatTurns.parts}, '{comparison,options}', (
      select jsonb_agg(case when option->>'id' = ${profileId} then ${JSON.stringify(deleted)}::jsonb else option end order by n)
      from jsonb_array_elements(${chatTurns.parts}->'comparison'->'options') with ordinality as options(option, n)))`,
  }).where(sql`${chatTurns.parts}->'comparison'->>'kind' = 'person' and ${chatTurns.parts}->'comparison'->'options' @> ${JSON.stringify([{ id: profileId }])}::jsonb`)
}

export async function deleteGoalsOf(tx: Tx, userId: string) {
  await tx.delete(goals).where(eq(goals.userId, userId))
  await tx.delete(anonymousSessions).where(eq(anonymousSessions.claimedByUserId, userId))
}

/** The latest religion and community that the person stated in a chat, for a new profile or a claim (PD3c, T-58). */
export async function ownValuesOf(db: Db | Tx, asker: Asker): Promise<OwnValues> {
  const mine = ownedBy(asker)
  const [[religion], [community]] = await Promise.all([
    db.select({ value: goals.ownReligion }).from(goals).where(and(mine, isNotNull(goals.ownReligion))).orderBy(desc(goals.ownReligionAt)).limit(1),
    db.select({ value: goals.ownCommunity }).from(goals).where(and(mine, isNotNull(goals.ownCommunity))).orderBy(desc(goals.ownCommunityAt)).limit(1),
  ])
  return { religion: religion?.value ?? null, community: community?.value ?? null }
}

/** At sign-in (T-17). The turns and the waitlist entries follow their goal, and the claimed session stays (T-35). */
export function claimSession(db: Db, key: string, userId: string) {
  return db.transaction(async (tx) => {
    // The row lock makes a second claim at the same time wait, then find no session to claim.
    const [session] = await tx.update(anonymousSessions).set({ claimedByUserId: userId, expiresAt: sql`now()` })
      .where(and(eq(anonymousSessions.keyHash, hashOf(key)), gt(anonymousSessions.expiresAt, sql`now()`), isNull(anonymousSessions.claimedByUserId)))
      .returning({ id: anonymousSessions.id })
    if (!session) return
    const own = await ownValuesOf(tx, { userId: null, sessionId: session.id })
    await tx.update(goals).set({ userId, anonymousSessionId: null }).where(eq(goals.anonymousSessionId, session.id))
    await moveObservations(tx, { anonymousSessionId: session.id, userId })
    await saveOwnValues(tx, userId, own)
  })
}
