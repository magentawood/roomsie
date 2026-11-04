import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import type { FastifyRequest } from 'fastify'
import { filledSlots, formA, type AnalyticsEvent, type FormA, type TurnLabel } from '@roomsie/contract'
import { extractor, noExtraction } from '../src/assistant/handlers/extractor/extractor'
import { routeTurn } from '../src/assistant/handlers/router/router'
import { assistantSettings } from '../src/assistant/settings'
import type { Db } from '../src/db/client'
import { seedCatalogues } from '../src/db/seed-axes'
import { ModelUnavailable, modelsOf, type Models, type Token } from '../src/models/models'
import { modelSettings } from '../src/models/settings'
import { createTestDb } from '../test/db'
import { reportOf, type ModelScores } from './report'
import type { CallResult, TurnResult } from './score'
import { evalSet } from './set'

/** One answer of the extractor model, with its token probabilities, so a replay scores it again with no call. */
type Recorded = { value: unknown; tokens: Token[] | null; model: string }
type RunTurn = { id: string; repeat: number; extractor: Recorded | null; label: TurnLabel }
type ModelRun = { model: string; turns: RunTurn[]; calls: CallResult[] }

// The spec of T-27: three repeats, and the sweep of the extractor threshold.
const repeats = 3
const settings = assistantSettings.parse(process.env)
const thresholds = [...new Set([0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, settings.minProbability])].toSorted()
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

const emptyTurn = (id: string) => ({ goalId: randomUUID(), text: textOf.get(id)!, last: null, lastRegister: null, form: formA.parse({}) })

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

/** The router and the extractor in parallel, as in a live turn (PD7a). The extractor answer is kept for the sweep. */
async function liveTurn(models: Models, db: Db, id: string, repeat: number, calls: CallResult[]): Promise<RunTurn> {
  const req = requestOf(id, calls)
  let answer: Recorded | null = null
  const recording: Models = {
    ...models,
    scored: async (call) => {
      const scored = await models.scored(call)
      if (call.role === 'extractor') answer = scored
      return scored
    },
  }
  const turn = emptyTurn(id)
  const [label] = await Promise.all([routeTurn(turn, { req, models: recording, settings }), extractor({ ...turn, ...noExtraction(turn.form, false) }, { req, db, models: recording, settings, today })])
  return { id, repeat, extractor: answer, label }
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
  const turn = emptyTurn(id)
  const { form } = await extractor({ ...turn, ...noExtraction(turn.form, false) }, { req: requestOf(id, []), db, models, settings: { ...settings, minProbability }, today })
  return valuesOf(form)
}

async function scoresOfRun({ model, turns, calls }: ModelRun, db: Db): Promise<ModelScores> {
  const sweep = []
  for (const threshold of thresholds) {
    const results = await inPool(turns, async (turn): Promise<TurnResult> => ({ id: turn.id, repeat: turn.repeat, values: await replayed(turn, db, threshold), label: turn.label }))
    sweep.push({ threshold, turns: results })
  }
  return { model, live: settings.minProbability, sweep, calls, repeats }
}

// `--replay <run file>` scores a saved run again with no model call, as after a change of a parser.
const { replay } = parseArgs({ options: { replay: { type: 'string' } } }).values
const { db, drop } = await createTestDb()
try {
  await seedCatalogues(db)
  const runs: ModelRun[] = replay ? JSON.parse(await readFile(replay, 'utf8')).runs : await liveRuns(db)
  const stamp = new Date().toISOString().slice(0, 16).replace(':', '')
  const folder = new URL('runs/', import.meta.url)
  await mkdir(folder, { recursive: true })
  if (!replay) await writeFile(new URL(`${stamp}.json`, folder), JSON.stringify({ setVersion: evalSet.version, runs }))
  const scores = []
  for (const run of runs) scores.push(await scoresOfRun(run, db))
  const report = new URL(`${stamp}.md`, folder)
  await writeFile(report, reportOf(`Eval run ${stamp}${replay ? `, a replay of ${replay}` : ''}`, evalSet.sentences, scores))
  console.log(`The report: ${report.pathname}`)
} finally {
  await drop()
}
