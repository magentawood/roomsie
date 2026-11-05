import { scopeBands, type AdminHomeCard, type AiOverviewResponse } from '@roomsie/contract'
import type { AnalyticsDb } from '../analytics/client'
import { bandCounts, callCounts, tokenSums } from '../analytics/read'
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

const noCalls = { calls: 0, failedShare: 0, geminiShare: 0, p95Ms: null }

async function callNumbers(analyticsDb: AnalyticsDb, now: Date, startOfDay: Date) {
  const [counts, recent, tokens, bands] = await Promise.all([
    callCounts(analyticsDb, startOfDay), callCounts(analyticsDb, hoursBefore(now, 0.25)), tokenSums(analyticsDb, startOfDay), bandCounts(analyticsDb, startOfDay),
  ])
  const rupeesOfRole = (role: string | null) => tokens.filter((t) => role === null || t.role === role)
    .reduce((sum, t) => { const vendor = vendorOf(t.model); return vendor ? sum + rupeesOf(vendor, t) : sum }, 0)
  const stats = ({ role, ...row }: (typeof counts)[number]) => ({ ...row, rupees: rupeesOfRole(role) })
  const { calls, failedShare, geminiShare } = recent.find((r) => r.role === null) ?? noCalls
  const all = counts.find((r) => r.role === null)
  return {
    today: all ? stats(all) : { ...noCalls, rupees: 0 },
    lastQuarterHour: { calls, failedShare, geminiShare },
    roles: counts.flatMap((r) => (r.role ? [{ ...stats(r), role: r.role }] : [])),
    bands: Object.fromEntries(scopeBands.map((band) => [band, bands.find((b) => b.band === band)?.turns ?? 0])) as Record<(typeof scopeBands)[number], number>,
  }
}

/** The AI pipeline of the admin: the switch, the spend of today, the numbers of the events, and the settings (T-65). */
export async function aiOverview(sources: AiSources): Promise<AiOverviewResponse> {
  const [state, spent, numbers] = await Promise.all([
    switchState(sources.db), spentOn(sources.db, sources.today()),
    sources.analyticsDb ? callNumbers(sources.analyticsDb, new Date(), startOfIstDay(sources.today())) : null,
  ])
  return {
    switch: state,
    spend: { today: spent, dailyAmount: sources.spend.dailyRupees },
    numbers,
    settings: { models: sources.models?.settings ?? null, spendAlertPercents, routerMinProbability: sources.assistant.routerMinProbability, limits: sources.limits },
  }
}

/** The card of the AI pipeline on the admin home (T-65). */
export async function aiCard(sources: Pick<AiSources, 'db' | 'analyticsDb' | 'spend' | 'today'>): Promise<AdminHomeCard> {
  const [state, spent, counts] = await Promise.all([
    switchState(sources.db), spentOn(sources.db, sources.today()), sources.analyticsDb ? callCounts(sources.analyticsDb, startOfIstDay(sources.today())) : null,
  ])
  const all = counts && (counts.find((r) => r.role === null) ?? noCalls)
  return {
    subject: 'ai_pipeline', spendToday: spent, dailyAmount: sources.spend.dailyRupees, geminiOnly: state.geminiOnly,
    failedShare: all?.failedShare ?? null, geminiShare: all?.geminiShare ?? null,
  }
}
