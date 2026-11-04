import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import type { FastifyRequest } from 'fastify'
import { z } from 'zod'
import { filledSlots, formA, modelRoles, turnLabel, type AnalyticsEvent, type FormA } from '@roomsie/contract'
import { extractor, noExtraction } from '../src/assistant/handlers/extractor/extractor'
import { routeTurn } from '../src/assistant/handlers/router/router'
import { assistantSettings } from '../src/assistant/settings'
import type { Db } from '../src/db/client'
import { seedCatalogues } from '../src/db/seed-axes'
import { ModelUnavailable, modelsOf, tokenSchema, type Models } from '../src/models/models'
import { modelSettings } from '../src/models/settings'
import { createTestDb } from '../test/db'
import { reportOf, type ModelScores } from './report'
import type { CallResult, TurnResult } from './score'
import { evalSet } from './set'

/** One answer of a model with its token probabilities, so a replay scores it again with no call. */
const recorded = z.strictObject({ value: z.unknown(), tokens: z.array(tokenSchema).nullable(), model: z.string() })
type Recorded = z.infer<typeof recorded>
/** The run file. A replay refuses a file of another version. */
const runFile = z.strictObject({
  version: z.literal(1),
  runs: z.array(z.strictObject({
    model: z.string(),
    turns: z.array(z.strictObject({ id: z.string(), repeat: z.int(), extractor: recorded.nullable(), router: recorded.nullable(), label: turnLabel })),
    calls: z.array(z.strictObject({ id: z.string(), role: z.enum(modelRoles), ms: z.number(), outcome: z.enum(['ok', 'invalid', 'failed']) })),
  })),
})
type ModelRun = z.infer<typeof runFile>['runs'][number]
type RunTurn = ModelRun['turns'][number]

const repeats = 3
const settings = assistantSettings.parse(process.env)
const thresholds = [...new Set([0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, settings.minProbability])].toSorted((a, b) => a - b)
const parallel = 8
const env = modelSettings.in.parse(process.env)
const today = () => evalSet.today
const textOf = new Map(evalSet.sentences.map((s) => [s.id, s.text]))

/** The fields of a request that the handlers read. The event `model_called` gives the time and the outcome of each attempt. */
const requestOf = (id: string, calls: CallResult[]) => ({
  server: {
    analytics: { track: (_req: unknown, event: AnalyticsEvent) => { if (event.name === 'model_called') calls.push({ id, role: event.role, ms: event.ms, outcome: event.outcome }) } },
    spend: { record: () => {} },
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

/** The router and the extractor in parallel, as in a live turn (PD7a). The run file keeps both answers. */
async function liveTurn(models: Models, db: Db, id: string, repeat: number, calls: CallResult[]): Promise<RunTurn> {
  const req = requestOf(id, calls)
  const answers: { extractor?: Recorded; router?: Recorded } = {}
  const recording: Models = {
    ...models,
    scored: async (call) => {
      const scored = await models.scored(call)
      if (call.role === 'extractor' || call.role === 'router') answers[call.role] = scored
      return scored
    },
  }
  const turn = emptyTurn(id)
  const [label] = await Promise.all([routeTurn(turn, { req, models: recording, settings }), extractor(turn, { req, db, models: recording, settings, today })])
  return { id, repeat, extractor: answers.extractor ?? null, router: answers.router ?? null, label }
}

async function liveRuns(db: Db): Promise<ModelRun[]> {
  const runs: ModelRun[] = []
  for (const model of [env.MODEL_PRIMARY, env.MODEL_FALLBACK]) {
    // One model as the primary and the fallback, so each score is of one model (the spec of T-27).
    const models = modelSettings.parse({ ...process.env, MODEL_PRIMARY: model, MODEL_FALLBACK: model })
    if (!models) throw new Error('Set DEEPSEEK_API_KEY and GEMINI_API_KEY in apps/api/.env.eval.')
    const calls: CallResult[] = []
    const jobs = evalSet.sentences.flatMap(({ id }) => Array.from({ length: repeats }, (_, i) => ({ id, repeat: i + 1 })))
    console.log(`${model}: ${jobs.length} turns`)
    runs.push({ model, turns: await inPool(jobs, ({ id, repeat }) => liveTurn(models, db, id, repeat, calls)), calls })
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

/** The extractor on a recorded answer at one threshold: the gate and the parsers run again, and no model is called. */
async function replayed({ id, extractor: recorded }: RunTurn, db: Db, minProbability: number) {
  const models: Models = {
    ...noVendor,
    scored: async (call) => {
      if (!recorded) throw new ModelUnavailable('the run has no answer of the extractor')
      const value = call.schema.parse(recorded.value)
      if (value === undefined) throw new ModelUnavailable('the recorded answer is empty')
      return { ...recorded, value }
    },
  }
  const { form } = await extractor(emptyTurn(id), { req: requestOf(id, []), db, models, settings: { ...settings, minProbability }, today })
  return valuesOf(form)
}

async function scoresOfRun({ model, turns, calls }: ModelRun, db: Db): Promise<ModelScores> {
  const sweep = await Promise.all(thresholds.map(async (threshold) => ({
    threshold,
    turns: await inPool(turns, async (turn): Promise<TurnResult> => ({ id: turn.id, repeat: turn.repeat, answered: turn.extractor !== null, values: await replayed(turn, db, threshold), label: turn.label })),
  })))
  return { model, live: settings.minProbability, sweep, calls, repeats }
}

// `--replay <run file>` scores a saved run again with no model call, as after a change of a parser.
const { replay } = parseArgs({ options: { replay: { type: 'string' } } }).values
const { db, drop } = await createTestDb()
try {
  await seedCatalogues(db)
  const runs = replay ? runFile.parse(JSON.parse(await readFile(replay, 'utf8'))).runs : await liveRuns(db)
  // The stamp is in UTC, as its Z says, with the seconds, so two runs in one minute keep their files.
  const stamp = `${new Date().toISOString().slice(0, 19).replaceAll(':', '')}Z`
  const folder = new URL('runs/', import.meta.url)
  await mkdir(folder, { recursive: true })
  if (!replay) await writeFile(new URL(`${stamp}.json`, folder), JSON.stringify({ version: 1, runs } satisfies z.input<typeof runFile>))
  const scores = await Promise.all(runs.map((run) => scoresOfRun(run, db)))
  const report = new URL(`${stamp}.md`, folder)
  await writeFile(report, reportOf(`Eval run ${stamp}${replay ? `, a replay of ${replay}` : ''}`, evalSet.sentences, scores))
  console.log(`The report: ${report.pathname}`)
} finally {
  await drop()
}
