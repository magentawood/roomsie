/** The eval of the observer (T-36): the live models on the sentences of M-03 and the personal sentences, as JSON for docs/research/. */
import Fastify from 'fastify'
import type { AnalyticsEvent } from '@roomsie/contract'
import { observer } from '../src/assistant/handlers/observer/observer'
import { assistantSettings } from '../src/assistant/settings'
import { seedCatalogues } from '../src/db/seed-axes'
import { modelSettings } from '../src/models/settings'
import { createTestDb } from '../test/db'
import { callStats } from '../eval/score'
import { evalSet } from '../eval/set'
import { scriptRequest } from './script-request'
import personalFile from '../eval/observer-sentences.json'

const models = modelSettings.parse(process.env)
if (!models) throw new Error('Set DEEPSEEK_API_KEY and GEMINI_API_KEY.')
const testDb = await createTestDb()
await seedCatalogues(testDb.db)
const { log } = Fastify({ logger: { level: 'warn' } })
const calls: Extract<AnalyticsEvent, { name: 'model_called' }>[] = []
const analytics = { track: (_: unknown, event: AnalyticsEvent) => { if (event.name === 'model_called') calls.push(event) } }
// The eval records no spend: it is not real traffic.
const deps = { req: scriptRequest({ analytics, spend: { record: () => {} } }, log), db: testDb.db, models, settings: assistantSettings.parse(process.env) }

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

const search = await run(evalSet.sentences.map(({ id, text }) => ({ id, text })))
const personal = await run(personalFile.sentences)
console.log(JSON.stringify({ search, personal, calls: { ...callStats(calls), fallback: calls.filter((c) => c.fallback).length } }, null, 1))
await testDb.drop()
