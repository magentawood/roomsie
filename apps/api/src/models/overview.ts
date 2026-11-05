import { modelRoles, scopeBands, type AdminHomeCard, type AiOverviewResponse, type ModelRole, type ScopeBand } from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'
import type { FastifyBaseLogger } from 'fastify'
import type { AnalyticsDb } from '../analytics/client'
import { bandCounts, callStats, tokenSums } from '../analytics/read'
import type { AssistantSettings } from '../assistant/settings'
import type { Db } from '../db/client'
import type { LimitSettings } from '../goals/settings'
import { hoursBefore, startOfIstDay } from '../time'
import { vendorOf, type Models } from './models'
import type { SpendSettings } from './settings'
import { rupeesOf, spendAlertPercents, spentOn } from './spend'
import { switchState } from './switch'

export type AiSources = {
  db: Db; analyticsDb?: AnalyticsDb; models?: Models; spend: SpendSettings; assistant: AssistantSettings; limits: LimitSettings; today: () => string
}
export type CardSources = Pick<AiSources, 'db' | 'analyticsDb' | 'spend' | 'today'>

const isRole = (role: string | null): role is ModelRole => modelRoles.some((r) => r === role)
/** The analytics database is a second project: a slow or failed read gives no numbers, and the page and the switch still show. */
async function bestEffort<T>(read: () => Promise<T>, log: FastifyBaseLogger): Promise<T | null> {
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('the analytics read took over 5 s')), 5_000).unref())
  return Promise.race([Promise.resolve().then(read), timeout]).catch((err: unknown) => {
    reportError(err, { where: 'models.overview', log })
    return null
  })
}

async function callNumbers(analyticsDb: AnalyticsDb, now: Date, startOfDay: Date) {
  const [counts, recent, tokens, bands] = await Promise.all([
    callStats(analyticsDb, startOfDay), callStats(analyticsDb, hoursBefore(now, 0.25)), tokenSums(analyticsDb, startOfDay), bandCounts(analyticsDb, startOfDay),
  ])
  const rupeesOfRole = (role: ModelRole) => tokens.filter((t) => t.role === role)
    .reduce((sum, t) => { const vendor = vendorOf(t.model); return vendor ? sum + rupeesOf(vendor, t) : sum }, 0)
  const all = counts.find((r) => r.role === null)!
  const { calls, failedShare, fallbackShare } = recent.find((r) => r.role === null)!
  return {
    today: { calls: all.calls, failedShare: all.failedShare, fallbackShare: all.fallbackShare, p95Ms: all.p95Ms },
    lastQuarterHour: { calls, failedShare, fallbackShare },
    roles: counts.flatMap(({ role, ...row }) => (isRole(role) ? [{ ...row, role, rupees: rupeesOfRole(role) }] : [])),
    bands: Object.fromEntries(scopeBands.map((band) => [band, bands.find((b) => b.band === band)?.turns ?? 0])) as Record<ScopeBand, number>,
  }
}

/** The AI pipeline of the admin: the switch, the spend of today, the numbers of the events, and the settings (T-65). */
export async function aiOverview(sources: AiSources, log: FastifyBaseLogger): Promise<AiOverviewResponse> {
  const { db, analyticsDb, today } = sources
  const [state, spent, numbers] = await Promise.all([
    switchState(db), spentOn(db, today()), analyticsDb ? bestEffort(() => callNumbers(analyticsDb, new Date(), startOfIstDay(today())), log) : null,
  ])
  return {
    switch: state,
    spend: { today: spent, dailyAmount: sources.spend.dailyRupees },
    numbers,
    settings: { models: sources.models?.settings ?? null, spendAlertPercents, routerMinProbability: sources.assistant.routerMinProbability, limits: sources.limits },
  }
}

/** The card of the AI pipeline on the admin home (T-65). */
export async function aiCard(sources: CardSources, log: FastifyBaseLogger): Promise<AdminHomeCard> {
  const { db, analyticsDb, today } = sources
  const [state, spent, counts] = await Promise.all([
    switchState(db), spentOn(db, today()), analyticsDb ? bestEffort(() => callStats(analyticsDb, startOfIstDay(today())), log) : null,
  ])
  const all = counts?.find((r) => r.role === null)
  return {
    subject: 'ai_pipeline', spendToday: spent, dailyAmount: sources.spend.dailyRupees, geminiOnly: state.geminiOnly,
    failedShare: all?.failedShare ?? null, fallbackShare: all?.fallbackShare ?? null,
  }
}
