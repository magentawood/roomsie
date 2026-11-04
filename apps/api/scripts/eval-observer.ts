/**
 * The eval of the observer (T-36): the live models on the 50 sentences of M-03 and the personal sentences.
 * It uses a disposable local database for the topics, and prints the results as JSON for docs/research/.
 */
import Fastify from 'fastify'
import { observer } from '../src/assistant/handlers/observer/observer'
import { assistantSettings } from '../src/assistant/settings'
import { seedCatalogues } from '../src/db/seed-axes'
import { modelSettings, spendSettings } from '../src/models/settings'
import { spendOf } from '../src/models/spend'
import { todayInIst } from '../src/today'
import { createTestDb } from '../test/db'
import { scriptRequest } from './script-request'
import searchFile from '../eval/sentences.json'
import personalFile from '../eval/observer-sentences.json'

const models = modelSettings.parse(process.env)
if (!models) throw new Error('Set DEEPSEEK_API_KEY and GEMINI_API_KEY.')
const testDb = await createTestDb()
await seedCatalogues(testDb.db)
const { log } = Fastify({ logger: { level: 'warn' } })
const spend = spendOf({ db: testDb.db, settings: spendSettings.parse({}), today: todayInIst, log })
const calls: { model: string; ms: number; outcome: string }[] = []
const analytics = { track: (_: unknown, event: { name: string; model?: string; ms?: number; outcome?: string }) => { if (event.name === 'model_called') calls.push({ model: event.model!, ms: event.ms!, outcome: event.outcome! }) } }
const deps = { req: scriptRequest({ analytics, spend }, log), db: testDb.db, models, settings: assistantSettings.parse(process.env) }

type Sentence = { id: string; text: string; expected?: string[] }
async function run(sentences: Sentence[]) {
  const rows = []
  for (const { id, text, expected } of sentences) {
    const { notes, rejected } = await observer({ goalId: '00000000-0000-7000-8000-000000000000', text, last: null }, deps)
    rows.push({ id, text, expected, rejected, notes: notes.map(({ key, kind, value, evidence, confidence }) => ({ key, kind, value, evidence, confidence: Math.round(confidence * 100) / 100 })) })
  }
  const notes = rows.reduce((n, r) => n + r.notes.length, 0)
  const rejected = rows.reduce((n, r) => n + r.rejected, 0)
  const summary: Record<string, number> = { sentences: rows.length, notes, rejected, rejectionRate: notes + rejected ? rejected / (notes + rejected) : 0 }
  if (rows.every((r) => r.expected)) {
    const wanted = rows.reduce((n, r) => n + r.expected!.length, 0)
    const found = rows.reduce((n, r) => n + r.expected!.filter((key) => r.notes.some((note) => note.key === key)).length, 0)
    const onTopic = rows.reduce((n, r) => n + r.notes.filter((note) => r.expected!.includes(note.key)).length, 0)
    Object.assign(summary, { expectedTopicsFound: wanted ? found / wanted : 0, notesOnExpectedTopic: notes ? onTopic / notes : 0, notesOnNoNoteSentences: rows.filter((r) => !r.expected!.length).reduce((n, r) => n + r.notes.length, 0) })
  }
  return { summary, rows }
}

const search = await run(searchFile.sentences.map(({ id, text }) => ({ id, text })))
const personal = await run(personalFile.sentences)
const ms = calls.map((c) => c.ms).sort((a, b) => a - b)
console.log(JSON.stringify({ search, personal, calls: { count: calls.length, fallback: calls.filter((c) => c.model.startsWith('gemini')).length, medianMs: ms[Math.floor(ms.length / 2)], p90Ms: ms[Math.floor(ms.length * 0.9)] } }, null, 1))
await spend.settled()
await testDb.drop()
