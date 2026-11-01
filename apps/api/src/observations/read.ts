import { and, asc, eq, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { Observation } from '@roomsie/contract'
import type { Db, Tx } from '../db/client'
import { observations, observationTopics } from '../db/schema'

export type Owner = { userId: string } | { anonymousSessionId: string }

const ownerColumn = (owner: Owner) => 'userId' in owner
  ? { column: observations.userId, id: owner.userId }
  : { column: observations.anonymousSessionId, id: owner.anonymousSessionId }

const ownedBy = (owner: Owner) => { const { column, id } = ownerColumn(owner); return eq(column, id) }

/** Saves a Form B note. A newer note on a topic replaces the older note. False: the topic is not in the catalogue, or is retired. */
export async function saveObservation(db: Db | Tx, owner: Owner, { key, value, kind, evidence, turn, confidence, visible }: Observation) {
  const [topic] = await db.select({ key: observationTopics.key }).from(observationTopics)
    .where(and(eq(observationTopics.key, key), eq(observationTopics.active, true)))
  if (!topic) return false
  const fields = { value, kind, evidence, turnId: turn, confidence, visible }
  await db.insert(observations).values({ ...owner, key, ...fields }).onConflictDoUpdate({
    target: [ownerColumn(owner).column, observations.key],
    set: { ...fields, updatedAt: sql`now()` },
  })
  return true
}

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

const other = alias(observations, 'other')

/** At sign-in (T-17): the notes of the session go to the user. On a topic that both have, the newer note stays. */
export async function moveObservations(tx: Tx, { anonymousSessionId, userId }: { anonymousSessionId: string; userId: string }) {
  await tx.execute(sql`
    delete from ${observations} using ${observations} as ${other}
    where ${observations.key} = ${other.key} and (
      (${observations.userId} = ${userId} and ${other.anonymousSessionId} = ${anonymousSessionId} and ${observations.updatedAt} <= ${other.updatedAt})
      or (${observations.anonymousSessionId} = ${anonymousSessionId} and ${other.userId} = ${userId} and ${observations.updatedAt} < ${other.updatedAt}))`)
  await tx.update(observations).set({ userId, anonymousSessionId: null }).where(eq(observations.anonymousSessionId, anonymousSessionId))
}
