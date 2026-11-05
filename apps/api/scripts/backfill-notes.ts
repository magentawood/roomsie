/** The one-off backfill of Form B (T-36): `pnpm backfill:notes --before=<the deploy time>` counts the turns and the cost, and `--apply` writes the notes. */
import { parseArgs } from 'node:util'
import Fastify from 'fastify'
import { z } from 'zod'
import { assistantSettings } from '../src/assistant/settings'
import { createDb } from '../src/db/client'
import { modelSettings, spendSettings } from '../src/models/settings'
import { spendOf } from '../src/models/spend'
import { geminiOnly } from '../src/models/switch'
import { backfillNotes } from '../src/observations/backfill'
import { todayInIst } from '../src/time'
import { scriptRequest } from './script-request'

const args = parseArgs({ options: { apply: { type: 'boolean', default: false }, before: { type: 'string' } } }).values
const before = new Date(z.iso.datetime({ offset: true, error: 'Give --before with the time of the T-36 deploy, as --before=2026-11-04T12:00:00+05:30.' }).parse(args.before))
const models = modelSettings.parse(process.env)
if (!models) throw new Error('Set DEEPSEEK_API_KEY and GEMINI_API_KEY.')
const db = createDb(z.url().parse(process.env.DATABASE_URL))
const { log } = Fastify({ logger: { level: 'warn' } })
// The backfill writes no analytics event: its traffic would count as people (the rule of _index.md). The spend still counts.
const server = { analytics: { track: () => {} }, spend: spendOf({ db, settings: spendSettings.parse(process.env), today: todayInIst, log }), geminiOnly: () => geminiOnly(db) }
const deps = { req: scriptRequest(server, log), models, settings: assistantSettings.parse(process.env) }

// The count comes first, so the person sees the turns and the cost before a write.
const { turns, estimatedRupees } = await backfillNotes(db, deps, { apply: false, before })
console.log(`${turns} turns to read, about ₹${estimatedRupees.toFixed(2)} at most.${args.apply ? '' : ' Run again with --apply to write the notes.'}`)
if (args.apply) console.log(`Saved ${(await backfillNotes(db, deps, { apply: true, before })).saved} notes.`)
await server.spend.settled()
await db.$client.end()
