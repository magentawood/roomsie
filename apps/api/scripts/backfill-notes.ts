/** The one-off backfill of Form B (T-36): `pnpm backfill:notes` counts the turns and the cost, and `--apply` writes the notes. */
import Fastify from 'fastify'
import { z } from 'zod'
import { analyticsOf } from '../src/analytics/track'
import { createAnalyticsDb } from '../src/analytics/client'
import { assistantSettings } from '../src/assistant/settings'
import { createDb } from '../src/db/client'
import { modelSettings, spendSettings } from '../src/models/settings'
import { spendOf } from '../src/models/spend'
import { backfillNotes } from '../src/observations/backfill'
import { todayInIst } from '../src/server'
import { scriptRequest } from './script-request'

const apply = process.argv.includes('--apply')
const models = modelSettings.parse(process.env)
if (!models) throw new Error('Set DEEPSEEK_API_KEY and GEMINI_API_KEY.')
const db = createDb(z.url().parse(process.env.DATABASE_URL))
const analyticsUrl = process.env.ANALYTICS_DATABASE_URL
const analyticsDb = analyticsUrl ? createAnalyticsDb(z.url().parse(analyticsUrl)) : undefined
const { log } = Fastify({ logger: { level: 'warn' } })
const server = { analytics: analyticsOf(analyticsDb, log), spend: spendOf({ db, settings: spendSettings.parse(process.env), today: todayInIst, log }) }
const deps = { req: scriptRequest(server, log), models, settings: assistantSettings.parse(process.env) }

const { turns, estimatedRupees } = await backfillNotes(db, deps, { apply: false })
console.log(`${turns} turns to read, about ₹${estimatedRupees.toFixed(2)} at most.${apply ? '' : ' Run again with --apply to write the notes.'}`)
if (apply) console.log(`Saved ${(await backfillNotes(db, deps, { apply: true })).saved} notes.`)
await server.spend.settled()
await server.analytics.close()
await db.$client.end()
await analyticsDb?.$client.end()
