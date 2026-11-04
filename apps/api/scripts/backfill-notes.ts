/** The one-off backfill of Form B (T-36): `pnpm backfill:notes` counts the turns and the cost, and `--apply` writes the notes. */
import Fastify, { type FastifyRequest } from 'fastify'
import { z } from 'zod'
import { analyticsOf } from '../src/analytics/track'
import { createAnalyticsDb } from '../src/analytics/client'
import { assistantSettings } from '../src/assistant/settings'
import { createDb } from '../src/db/client'
import { modelSettings, spendSettings } from '../src/models/settings'
import { spendOf } from '../src/models/spend'
import { backfillNotes } from '../src/observations/backfill'

const apply = process.argv.includes('--apply')
const models = modelSettings.parse(process.env)
if (!models) throw new Error('Set DEEPSEEK_API_KEY and GEMINI_API_KEY.')
const db = createDb(z.url().parse(process.env.DATABASE_URL))
const analyticsUrl = process.env.ANALYTICS_DATABASE_URL
const analyticsDb = analyticsUrl ? createAnalyticsDb(z.url().parse(analyticsUrl)) : undefined
const { log } = Fastify({ logger: { level: 'warn' } })
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
const server = { analytics: analyticsOf(analyticsDb, log), spend: spendOf({ db, settings: spendSettings.parse(process.env), today, log }) }
// The model module records each call on the analytics and the spend of the server, as for a request.
const req = { server, log, user: null, analyticsId: null } as unknown as FastifyRequest

const { turns, estimatedRupees, saved } = await backfillNotes(db, { req, models, settings: assistantSettings.parse(process.env) }, { apply })
const cost = `about ₹${estimatedRupees.toFixed(2)} at most`
console.log(apply ? `Read ${turns} turns (${cost}) and saved ${saved} notes.` : `${turns} turns to read, ${cost}. Run again with --apply to write the notes.`)
await server.spend.settled()
await server.analytics.close()
await db.$client.end()
await analyticsDb?.$client.end()
