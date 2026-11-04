import { statesHiddenPreference, userTurnParts } from '@roomsie/contract'
import { notePlanOf } from '../assistant/assistant'
import { observer, type ObserverDeps } from '../assistant/handlers/observer/observer'
import { observerPrompt } from '../assistant/handlers/observer/prompt'
import type { Db } from '../db/client'
import { contextTurnsOf, lastReplyOf, turnTimeOf } from '../goals/store'
import { rupeesOf } from '../models/spend'
import { activeTopics, noteTurnOf, saveObservation, turnsWithNotes, type Owner } from './read'

/** A high guess: about four characters for each token, no cache hit, and a long answer. */
const guessUsage = (chars: number) => ({ tokensIn: Math.ceil(chars / 4), cachedTokensIn: 0, tokensOut: 150 })

async function hasNewerNote(db: Db, owner: Owner, key: string, at: Date) {
  const turn = await noteTurnOf(db, owner, key)
  const time = turn && await turnTimeOf(db, turn)
  return !!time && time > at
}

/**
 * The one-off job of T-36: the notes of the typed turns from before the observer, oldest first. A turn with a note is done,
 * so a second run calls no model for it. A note never replaces a note from a newer turn. Without `apply`, it only counts.
 */
export async function backfillNotes(db: Db, deps: Omit<ObserverDeps, 'db'>, { apply }: { apply: boolean }) {
  const all = await contextTurnsOf(db)
  const done = await turnsWithNotes(db, all.map(({ id }) => id))
  const turns = all.flatMap((turn) => {
    const label = userTurnParts.safeParse(turn.parts)
    const plan = !done.has(turn.id) && label.success ? notePlanOf(label.data, statesHiddenPreference(label.data), deps.settings) : null
    return plan ? [{ ...turn, visible: plan.visible }] : []
  })
  const prompt = observerPrompt(await activeTopics(db)).length
  const estimatedRupees = turns.reduce((sum, { text }) => sum + rupeesOf('deepseek', guessUsage(prompt + text.length)), 0)
  if (!apply) return { turns: turns.length, estimatedRupees, saved: 0 }

  let saved = 0
  for (const turn of turns) {
    const last = await lastReplyOf(db, turn.goalId, turn.createdAt)
    const { notes } = await observer({ goalId: turn.goalId, text: turn.text, last }, { ...deps, db })
    for (const note of notes) {
      if (await hasNewerNote(db, turn.owner, note.key, turn.createdAt)) continue
      if (await saveObservation(db, turn.owner, { version: 1, ...note, turn: turn.id, visible: turn.visible })) saved++
    }
  }
  return { turns: turns.length, estimatedRupees, saved }
}
