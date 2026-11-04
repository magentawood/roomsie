import { statesHiddenPreference, userTurnParts } from '@roomsie/contract'
import { notePlanOf } from '../assistant/assistant'
import { observer, type ObserverDeps } from '../assistant/handlers/observer/observer'
import { observerPrompt } from '../assistant/handlers/observer/prompt'
import type { Db } from '../db/client'
import { contextTurnsOf, lastReplyOf } from '../goals/store'
import { rupeesOf } from '../models/spend'
import { activeTopics, observationsOf, saveObservation, turnsWithNotes } from './read'

/** A high guess: two characters for each token, as Devanagari can take, no cache hit, and a long answer. */
const guessUsage = (chars: number) => ({ tokensIn: Math.ceil(chars / 2), cachedTokensIn: 0, tokensOut: 150 })

/**
 * The one-off job of T-36: the notes of the typed turns before `before`, the time of the deploy of the observer.
 * A later turn is out, so a note that the person deleted does not come back. A turn with a note is done, and a note
 * never replaces a note from a newer turn. A goal with an own religion or community gives no note (PD3c).
 */
export async function backfillNotes(db: Db, deps: Omit<ObserverDeps, 'db'>, { apply, before }: { apply: boolean; before: Date }) {
  const all = await contextTurnsOf(db, before)
  const done = await turnsWithNotes(db, all.map(({ id }) => id))
  const timeOf = new Map(all.map(({ id, createdAt }) => [id, createdAt]))
  const planned = all.flatMap((turn) => {
    const label = userTurnParts.safeParse(turn.parts)
    const plan = !done.has(turn.id) && label.success ? notePlanOf(label.data, statesHiddenPreference(label.data) || turn.ownValue, deps.settings) : null
    return plan ? [{ ...turn, visible: plan.visible }] : []
  })
  const prompt = observerPrompt(await activeTopics(db)).length
  let estimatedRupees = 0
  const turns = []
  for (const turn of planned) {
    const last = await lastReplyOf(db, turn.goalId, turn.createdAt)
    estimatedRupees += rupeesOf('deepseek', guessUsage(prompt + turn.text.length + (last?.question?.length ?? 0)))
    turns.push({ ...turn, last })
  }
  if (!apply) return { turns: turns.length, estimatedRupees, saved: 0 }

  let saved = 0
  for (const turn of turns) {
    const { notes } = await observer({ goalId: turn.goalId, text: turn.text, last: turn.last }, { ...deps, db })
    for (const note of notes) {
      // A kept note of a turn that the backfill does not read is newer: it came after `before`.
      const kept = (await observationsOf(db, turn.owner)).find(({ key }) => key === note.key)
      const keptAt = kept && timeOf.get(kept.turn)
      if (kept && !(keptAt && keptAt < turn.createdAt)) continue
      if (await saveObservation(db, turn.owner, { version: 1, ...note, turn: turn.id, visible: turn.visible })) saved++
    }
  }
  return { turns: turns.length, estimatedRupees, saved }
}
