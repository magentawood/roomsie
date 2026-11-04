import { and, asc, desc, eq, gt, lt, notExists, sql } from 'drizzle-orm'
import { assistantParts, statesHiddenPreference, userTurnParts } from '@roomsie/contract'
import { observeOf, type AssistantDeps } from '../assistant/assistant'
import { observer } from '../assistant/handlers/observer/observer'
import { observerPrompt } from '../assistant/handlers/observer/prompt'
import type { Db } from '../db/client'
import { chatTurns, goals, observations } from '../db/schema'
import { rupeesOf } from '../models/spend'
import { activeTopics, saveObservation, type Owner } from './read'

/** A high guess: about four characters for each token, no cache hit, and a long answer. */
const guessUsage = (chars: number) => ({ tokensIn: Math.ceil(chars / 4), cachedTokensIn: 0, tokensOut: 150 })

/**
 * The one-off job of T-36: the notes of the typed turns from before the observer, oldest first. A turn with a note is done,
 * so a second run calls no model for it. A note never replaces a note from a newer turn. Without `apply`, it only counts.
 */
export async function backfillNotes(db: Db, deps: Pick<AssistantDeps, 'req' | 'models' | 'settings'>, { apply }: { apply: boolean }) {
  const rows = await db.select({
    id: chatTurns.id, goalId: chatTurns.goalId, text: chatTurns.text, parts: chatTurns.parts, createdAt: chatTurns.createdAt,
    userId: goals.userId, anonymousSessionId: goals.anonymousSessionId,
  }).from(chatTurns).innerJoin(goals, eq(goals.id, chatTurns.goalId))
    .where(and(eq(chatTurns.role, 'user'), eq(chatTurns.inputMethod, 'typed'), sql`${chatTurns.parts}->'kinds' ? 'context'`,
      notExists(db.select({ id: observations.id }).from(observations).where(eq(observations.turnId, chatTurns.id)))))
    .orderBy(asc(chatTurns.createdAt))
  const turns = rows.filter(({ parts }) => {
    const label = userTurnParts.safeParse(parts)
    return label.success && observeOf(label.data, statesHiddenPreference(label.data), deps.settings) !== null
  })
  const prompt = observerPrompt(await activeTopics(db)).length
  const estimatedRupees = turns.reduce((sum, { text }) => sum + rupeesOf('deepseek', guessUsage(prompt + text.length)), 0)
  if (!apply) return { turns: turns.length, estimatedRupees, saved: 0 }

  let saved = 0
  for (const turn of turns) {
    const label = userTurnParts.parse(turn.parts)
    const { visible } = observeOf(label, statesHiddenPreference(label), deps.settings)!
    const [before] = await db.select({ parts: chatTurns.parts }).from(chatTurns)
      .where(and(eq(chatTurns.goalId, turn.goalId), eq(chatTurns.role, 'assistant'), lt(chatTurns.createdAt, turn.createdAt))).orderBy(desc(chatTurns.createdAt)).limit(1)
    const last = before ? assistantParts.parse(before.parts) : null
    const { notes } = await observer({ goalId: turn.goalId, text: turn.text, last }, { ...deps, db })
    const owner: Owner = turn.userId ? { userId: turn.userId } : { anonymousSessionId: turn.anonymousSessionId! }
    for (const note of notes) {
      if (await hasNewerNote(db, owner, note.key, turn.createdAt)) continue
      if (await saveObservation(db, owner, { version: 1, ...note, turn: turn.id, visible })) saved++
    }
  }
  return { turns: turns.length, estimatedRupees, saved }
}

async function hasNewerNote(db: Db, owner: Owner, key: string, at: Date) {
  const ownerIs = 'userId' in owner ? eq(observations.userId, owner.userId) : eq(observations.anonymousSessionId, owner.anonymousSessionId)
  const [newer] = await db.select({ id: observations.id }).from(observations).innerJoin(chatTurns, eq(chatTurns.id, observations.turnId))
    .where(and(ownerIs, eq(observations.key, key), gt(chatTurns.createdAt, at))).limit(1)
  return newer !== undefined
}
