import { z } from 'zod'
import { composerInput, turnLabel } from '@roomsie/contract'
import type { Token } from '../src/models/models'
import { callResult } from './score'

const token: z.ZodType<Token> = z.object({ token: z.string(), logprob: z.number() })
/** One answer of a model with its token probabilities, so a replay scores it again with no call. */
const recordedAnswer = z.strictObject({ value: z.unknown(), tokens: z.array(token).nullable(), model: z.string() })
export type Recorded = z.infer<typeof recordedAnswer>
/** The composer call of a turn: its input, its text (null: no answer), and the time of all its attempts (T-61). */
const recordedComposer = z.strictObject({ input: composerInput, text: z.string().nullable(), ms: z.number() })
/** The run file. A replay refuses a file of another version. `judge` is the router call on the text of the composer. */
export const runFile = z.strictObject({
  version: z.literal(2),
  runs: z.array(z.strictObject({
    model: z.string(),
    turns: z.array(z.strictObject({
      // `label` is for a person to read: the scores replay the label at each threshold.
      id: z.string(), repeat: z.int(), extractor: recordedAnswer.nullable(), router: recordedAnswer.nullable(), label: turnLabel,
      composer: recordedComposer.nullable(), judge: recordedAnswer.nullable(),
    })),
    calls: z.array(callResult),
  })),
})
export type ModelRun = z.infer<typeof runFile>['runs'][number]
export type RunTurn = ModelRun['turns'][number]

/** The runs of several files as one run for each model: the repeats of a later file come after those of the earlier file. */
export function mergedRuns(files: ModelRun[][]) {
  const merged = new Map<string, ModelRun>()
  for (const run of files.flat()) {
    const seen = merged.get(run.model) ?? { ...run, turns: [], calls: [] }
    merged.set(run.model, seen)
    const offset = Math.max(0, ...seen.turns.map((t) => t.repeat))
    seen.turns.push(...run.turns.map((t) => ({ ...t, repeat: t.repeat + offset })))
    seen.calls.push(...run.calls)
  }
  return [...merged.values()]
}
