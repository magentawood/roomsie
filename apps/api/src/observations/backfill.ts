import { statesHiddenPreference, userTurnParts } from '@roomsie/contract'
import { notePlanOf } from '../assistant/assistant'
import { observer, type ObserverDeps } from '../assistant/handlers/observer/observer'
import { observerPrompt } from '../assistant/handlers/observer/prompt'
import type { Db } from '../db/client'
import { contextTurnsOf, lastReplyOf, saveOnGoalOwner } from '../goals/store'
import { rupeesOf } from '../models/spend'
import { activeTopics, observationsOf, oldestObservationAt, saveObservation, turnsWithNotes } from './read'

/** A high guess: two characters for each token, as Devanagari can take, no cache hit, and a long answer. */
const guessUsage = (chars: number) => ({ tokensIn: Math.ceil(chars / 2), cachedTokensIn: 0, tokensOut: 150 })

/** The one-off job of T-36. `before` is the time of the deploy, so a deleted note does not come back. A turn with a note is done. */
export async function backfillNotes(db: Db, deps: Omit<ObserverDeps, 'db'>, { apply, before }: { apply: boolean; before: Date }) {
  const oldest = await oldestObservationAt(db)
  if (oldest && before > new Date(oldest)) throw new Error(`--before is later than the oldest note (${new Date(oldest).toISOString()}). Give the time of the deploy.`)
  const all = await contextTurnsOf(db, before)
  const done = await turnsWithNotes(db, all.map(({ id }) => id))
  // The goal keeps no turn of an own religion or community, so each turn of the goal gives no note (PD3c).
  const planned = all.flatMap((turn) => {
    const label = userTurnParts.safeParse(turn.parts)
    const plan = !done.has(turn.id) && label.success ? notePlanOf(label.data, statesHiddenPreference(label.data) || turn.hasOwnReligionOrCommunity, deps.settings) : null
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
    await saveOnGoalOwner(db, turn.goalId, async (tx, owner) => {
      for (const note of notes) {
        // A kept note of a turn that the backfill does not read is newer.
        const kept = (await observationsOf(tx, owner)).find(({ key }) => key === note.key)
        const keptAt = kept && all.find(({ id }) => id === kept.turn)?.createdAt
        if (kept && !(keptAt && keptAt < turn.createdAt)) continue
        if (await saveObservation(tx, owner, { version: 1, ...note, turn: turn.id, visible: turn.visible })) saved++
      }
    })
  }
  return { turns: turns.length, estimatedRupees, saved }
}
