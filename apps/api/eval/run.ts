import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import type { FastifyRequest } from 'fastify'
import { z } from 'zod'
import { composerInput, filledSlots, formA, turnLabel, type AnalyticsEvent, type FormA, type ModelRole } from '@roomsie/contract'
import { runTurn } from '../src/assistant/assistant'
import { extractor, noExtraction } from '../src/assistant/handlers/extractor/extractor'
import { routeTurn } from '../src/assistant/handlers/router/router'
import { assistantSettings } from '../src/assistant/settings'
import type { Db } from '../src/db/client'
import { seedCatalogues } from '../src/db/seed-axes'
import { ModelUnavailable, modelsOf, type Models, type Token } from '../src/models/models'
import { modelSettings } from '../src/models/settings'
import { createTestDb } from '../test/db'
import { reportOf, type ModelScores } from './report'
import { callResult, type CallResult, type TurnResult } from './score'
import { evalSet } from './set'

const token: z.ZodType<Token> = z.object({ token: z.string(), logprob: z.number() })
/** One answer of a model with its token probabilities, so a replay scores it again with no call. */
const recordedAnswer = z.strictObject({ value: z.unknown(), tokens: z.array(token).nullable(), model: z.string() })
type Recorded = z.infer<typeof recordedAnswer>
/** The composer call of a turn: its input, its text (null: no answer), and the time of all its attempts (T-61). */
const recordedComposer = z.strictObject({ input: composerInput, text: z.string().nullable(), ms: z.number() })
/** The run file. A replay refuses a file of another version. Version 2 has the composer and the register of its text (T-61). */
const runFile = z.strictObject({
  version: z.literal(2),
  runs: z.array(z.strictObject({
    model: z.string(),
    turns: z.array(z.strictObject({
      id: z.string(), repeat: z.int(), extractor: recordedAnswer.nullable(), router: recordedAnswer.nullable(), label: turnLabel,
      composer: recordedComposer.nullable(), judge: turnLabel.shape.register,
    })),
    calls: z.array(callResult),
  })),
})
type ModelRun = z.infer<typeof runFile>['runs'][number]
type RunTurn = ModelRun['turns'][number]

const repeats = 3
const settings = assistantSettings.parse(process.env)
const thresholds = [...new Set([0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, settings.minProbability, settings.routerMinProbability])].toSorted((a, b) => a - b)
// No deadline: the timeout of the model module is the only limit (the spec of T-61). A larger timer of Node fires at once.
const noDeadline = 600_000
const parallel = 8
const env = modelSettings.in.parse(process.env)
const today = () => evalSet.today
const textOf = new Map(evalSet.sentences.map((s) => [s.id, s.text]))

/** The fields of a request that the handlers read. The event `model_called` gives the time and the outcome of each attempt. */
const requestOf = (id: string, calls: CallResult[]) => ({
  server: {
    analytics: { track: (_req: unknown, event: AnalyticsEvent) => { if (event.name === 'model_called') calls.push({ id, role: event.role, ms: event.ms, outcome: event.outcome }) } },
    spend: { record: () => {} },
    // The eval asks each model on purpose, so the switch of the admin is off.
    geminiOnly: async () => false,
  },
  log: { info: () => {}, warn: () => {}, error: () => {} },
  user: null,
}) as unknown as FastifyRequest

const emptyTurn = (id: string) => ({ goalId: randomUUID(), text: textOf.get(id)!, last: null, lastRegister: null, ...noExtraction(formA.parse({}), false) })

async function inPool<T, R>(items: T[], run: (item: T) => Promise<R>) {
  const results: R[] = []
  let next = 0
  await Promise.all(Array.from({ length: parallel }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await run(items[i]!)
    }
  }))
  return results
}

/** One model as the primary and the fallback, so each score is of one model (the spec of T-27). */
function onlyModel(model: string) {
  const models = modelSettings.parse({ ...process.env, MODEL_PRIMARY: model, MODEL_FALLBACK: model })
  if (!models) throw new Error('Set DEEPSEEK_API_KEY and GEMINI_API_KEY in apps/api/.env.eval.')
  return models
}

/**
 * A live turn, as in the chat (PD7a): the router and the extractor in parallel, then the reply writer and the composer.
 * The run file keeps each answer. The judge, a router call on one fixed model, then gives the register of the text of the composer (T-61).
 */
async function liveTurn(models: Models, judge: Models, db: Db, id: string, repeat: number, calls: CallResult[]): Promise<RunTurn> {
  const req = requestOf(id, calls)
  const answers: Partial<Record<ModelRole, Recorded>> = {}
  let composer: RunTurn['composer'] = null
  const recording: Models = {
    ...models,
    scored: async (call) => {
      const scored = await models.scored(call)
      answers[call.role] = scored
      return scored
    },
    json: async (call) => {
      if (call.role !== 'composer') return models.json(call)
      // The message of the composer is its input as JSON, so the run file gets the plan that the composer got.
      const input = composerInput.parse(JSON.parse(call.messages[0]!.content))
      const start = performance.now()
      const answer = await models.json(call).catch((err: unknown) => {
        composer = { input, text: null, ms: Math.round(performance.now() - start) }
        throw err
      })
      composer = { input, text: (answer as { text: string }).text, ms: Math.round(performance.now() - start) }
      return answer
    },
  }
  const goalId = randomUUID()
  const { label } = await runTurn(
    { goalId, text: textOf.get(id)!, last: null, form: formA.parse({}), lastRegister: null, notesHint: false, context: { turns: [], formB: [] }, comparison: null },
    { req, db, models: recording, settings: { ...settings, composerDeadlineMs: noDeadline }, today },
  )
  const text = (composer as RunTurn['composer'])?.text
  // The calls of the judge stay out of the times of the run.
  const judged = text ? await routeTurn({ goalId, text, last: null }, { req: requestOf(id, []), models: judge, settings }) : null
  return { id, repeat, extractor: answers.extractor ?? null, router: answers.router ?? null, label, composer, judge: judged?.register ?? null }
}

async function liveRuns(db: Db): Promise<ModelRun[]> {
  const runs: ModelRun[] = []
  // The judge is the primary model of PD7, DeepSeek, also in the run of the fallback, so the judge does not change (the spec of T-61).
  const judge = onlyModel(env.MODEL_PRIMARY)
  for (const model of [env.MODEL_PRIMARY, env.MODEL_FALLBACK]) {
    const models = onlyModel(model)
    const calls: CallResult[] = []
    const jobs = evalSet.sentences.flatMap(({ id }) => Array.from({ length: repeats }, (_, i) => ({ id, repeat: i + 1 })))
    console.log(`${model}: ${jobs.length} turns`)
    runs.push({ model, turns: await inPool(jobs, ({ id, repeat }) => liveTurn(models, judge, db, id, repeat, calls)), calls })
  }
  return runs
}

/** The set states no religion and no community, so each hidden slot with a value is made up. */
const valuesOf = (form: FormA) => ({
  ...filledSlots(form),
  ...Object.fromEntries((['religionPreference', 'communityPreference'] as const).flatMap((key) => (form[key].source === 'empty' ? [] : [[key, form[key].value]]))),
})

// The replay calls only `scored`, so this module needs no key.
const noVendor = modelsOf({ keys: { deepseek: '', gemini: '' }, primary: env.MODEL_PRIMARY, fallback: env.MODEL_FALLBACK, timeoutMs: 1 })

/** A model module that gives a recorded answer and calls no model. No answer: the call fails, as when no model answered. */
const replaying = (recorded: Recorded | null): Models => ({
  ...noVendor,
  scored: async (call) => {
    if (!recorded) throw new ModelUnavailable('the run has no answer of this handler')
    const value = call.schema.parse(recorded.value)
    if (value === undefined) throw new ModelUnavailable('the recorded answer is empty')
    return { ...recorded, value }
  },
})

/** The extractor on a recorded answer at one threshold: the gate and the parsers run again, and no model is called. */
async function replayed({ id, extractor: recorded }: RunTurn, db: Db, minProbability: number) {
  const { form } = await extractor(emptyTurn(id), { req: requestOf(id, []), db, models: replaying(recorded), settings: { ...settings, minProbability }, today })
  return valuesOf(form)
}

/** The router on a recorded answer at one threshold (T-61). */
const replayedLabel = ({ id, router: recorded }: RunTurn, routerMinProbability: number) =>
  routeTurn({ goalId: randomUUID(), text: textOf.get(id)!, last: null }, { req: requestOf(id, []), models: replaying(recorded), settings: { ...settings, routerMinProbability } })

const composerOf = ({ composer, judge }: RunTurn): TurnResult['composer'] =>
  composer ? { language: composer.input.language, draft: composer.input.draft, message: composer.input.message, text: composer.text, ms: composer.ms, judge } : undefined

async function scoresOfRun({ model, turns, calls }: ModelRun, db: Db): Promise<ModelScores> {
  // One pool for each threshold and turn, so `parallel` limits the replays.
  const jobs = thresholds.flatMap((threshold) => turns.map((turn) => ({ threshold, turn })))
  const results = await inPool(jobs, async ({ threshold, turn }) => ({
    threshold, id: turn.id, repeat: turn.repeat, extractorAnswered: turn.extractor !== null,
    values: await replayed(turn, db, threshold), label: await replayedLabel(turn, threshold), composer: composerOf(turn),
  }))
  const sweep = thresholds.map((threshold) => ({ threshold, turns: results.filter((r) => r.threshold === threshold) }))
  return { model, live: settings.minProbability, routerLive: settings.routerMinProbability, sweep, calls, repeats: Math.max(...turns.map((t) => t.repeat)) }
}

/** The runs of several files as one run for each model: the repeats of a later file come after those of the earlier file. */
function mergedRuns(files: ModelRun[][]) {
  const merged = new Map<string, ModelRun>()
  for (const run of files.flat()) {
    const seen = merged.get(run.model)
    if (!seen) merged.set(run.model, { ...run, turns: [...run.turns], calls: [...run.calls] })
    else {
      const offset = Math.max(...seen.turns.map((t) => t.repeat))
      seen.turns.push(...run.turns.map((t) => ({ ...t, repeat: t.repeat + offset })))
      seen.calls.push(...run.calls)
    }
  }
  return [...merged.values()]
}

// `--replay <run file>` scores a saved run again with no model call, as after a change of a parser.
// Two `--replay` files make one report of the two runs, as the rules of T-61 ask.
const { replay = [] } = parseArgs({ options: { replay: { type: 'string', multiple: true } } }).values
const { db, drop } = await createTestDb()
try {
  await seedCatalogues(db)
  const runs = replay.length
    ? mergedRuns(await Promise.all(replay.map(async (file) => runFile.parse(JSON.parse(await readFile(file, 'utf8'))).runs)))
    : await liveRuns(db)
  // Seconds in the stamp: two runs in one minute keep their files.
  const stamp = new Date().toISOString().replace(/:|\.\d+/g, '')
  const folder = new URL('runs/', import.meta.url)
  await mkdir(folder, { recursive: true })
  if (!replay.length) await writeFile(new URL(`${stamp}.json`, folder), JSON.stringify({ version: 2, runs } satisfies z.input<typeof runFile>))
  const scores = await Promise.all(runs.map((run) => scoresOfRun(run, db)))
  const report = new URL(`${stamp}.md`, folder)
  await writeFile(report, reportOf(`Eval run ${stamp}${replay.length ? `, a replay of ${replay.join(' and ')}` : ''}`, evalSet.sentences, scores))
  console.log(`The report: ${report.pathname}`)
} finally {
  await drop()
}
