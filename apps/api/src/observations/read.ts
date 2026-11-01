import { and, asc, eq, sql } from 'drizzle-orm'
import type { Observation } from '@roomsie/contract'
import type { Db, Tx } from '../db/client'
import { observations, observationTopics } from '../db/schema'

/** A note belongs to a user or to a visitor session, never both. */
export type Owner = { userId: string } | { anonymousSessionId: string }

const ownedBy = (owner: Owner) => 'userId' in owner
  ? eq(observations.userId, owner.userId)
  : eq(observations.anonymousSessionId, owner.anonymousSessionId)

/** Saves a Form B note. A newer note on a topic replaces the older note. False: the topic is not in the catalogue, or is retired. */
export async function saveObservation(db: Db | Tx, owner: Owner, { key, value, kind, evidence, turn, confidence, visible }: Observation) {
  const [topic] = await db.select({ key: observationTopics.key }).from(observationTopics)
    .where(and(eq(observationTopics.key, key), eq(observationTopics.active, true)))
  if (!topic) return false
  const fields = { value, kind, evidence, turnId: turn, confidence, visible }
  await db.insert(observations).values({ ...owner, key, ...fields }).onConflictDoUpdate({
    target: 'userId' in owner ? [observations.userId, observations.key] : [observations.anonymousSessionId, observations.key],
    set: { ...fields, updatedAt: sql`now()` },
  })
  return true
}

/** The notes of an owner, oldest first. */
export async function observationsOf(db: Db | Tx, owner: Owner) {
  const rows = await db.select({
    id: observations.id, key: observations.key, value: observations.value, kind: observations.kind, evidence: observations.evidence,
    turn: observations.turnId, confidence: observations.confidence, visible: observations.visible,
  }).from(observations).where(ownedBy(owner)).orderBy(asc(observations.createdAt))
  return rows.map((row) => ({ version: 1 as const, ...row }))
}

/** A delete by the user is a direct database action, never an edit by the model (PD7a). */
export const deleteObservation = (db: Db | Tx, owner: Owner, id: string) =>
  db.delete(observations).where(and(eq(observations.id, id), ownedBy(owner)))

/** The tombstone keeps the users row, so its cascade does not remove the notes of the user. */
export const deleteObservationsOf = (tx: Tx, userId: string) => tx.delete(observations).where(eq(observations.userId, userId))

/** At sign-in (T-17): the notes of the session go to the user. On a topic that both have, the newer note stays. */
export async function moveObservations(tx: Tx, anonymousSessionId: string, userId: string) {
  await tx.execute(sql`
    delete from observations o using observations other
    where o.key = other.key and (
      (o.user_id = ${userId} and other.anonymous_session_id = ${anonymousSessionId} and o.updated_at <= other.updated_at)
      or (o.anonymous_session_id = ${anonymousSessionId} and other.user_id = ${userId} and o.updated_at < other.updated_at))`)
  await tx.update(observations).set({ userId, anonymousSessionId: null }).where(eq(observations.anonymousSessionId, anonymousSessionId))
}
