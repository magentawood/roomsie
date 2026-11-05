import { modelRoles, scopeBands, type AdminHomeCard, type AiOverviewResponse, type ModelRole } from '@roomsie/contract'
import type { AnalyticsDb } from '../analytics/client'
import { bandCounts, callCounts, tokenSums } from '../analytics/read'
import type { AssistantSettings } from '../assistant/settings'
import type { Db } from '../db/client'
import type { LimitSettings } from '../goals/settings'
import { hoursBefore } from '../time'
import { emailsOf } from '../users'
import { vendorOf, type Models } from './models'
import type { SpendSettings } from './settings'
import { rupeesOf, spendAlertPercents, spentOn } from './spend'
import { switchFlips } from './switch'

export type AiSources = {
  db: Db; analyticsDb?: AnalyticsDb; models?: Models; spend: SpendSettings; assistant: AssistantSettings; limits: LimitSettings; today: () => string
}

const share = (part: number, all: number) => (all ? part / all : 0)
const startOfDayOf = (day: string) => new Date(`${day}T00:00:00+05:30`)

export async function switchState(db: Db) {
  const [newest] = await switchFlips(db, 1)
  const emails = await emailsOf(db, newest?.userId ? [newest.userId] : [])
  return { geminiOnly: newest?.geminiOnly ?? false, since: newest?.at.toISOString() ?? null, by: (newest?.userId && emails.get(newest.userId)) ?? null }
}

async function numbers(analyticsDb: AnalyticsDb, now: Date, startOfDay: Date) {
  const [counts, recent, tokens, bands] = await Promise.all([
    callCounts(analyticsDb, startOfDay), callCounts(analyticsDb, hoursBefore(now, 0.25)), tokenSums(analyticsDb, startOfDay), bandCounts(analyticsDb, startOfDay),
  ])
  const rupeesOfRole = (role: string | null) => tokens.filter((t) => role === null || t.role === role)
    .reduce((sum, t) => { const vendor = vendorOf(t.model); return vendor ? sum + rupeesOf(vendor, t) : sum }, 0)
  const stats = (row: (typeof counts)[number] | undefined) => ({
    calls: row?.calls ?? 0, failedShare: share(row?.failed ?? 0, row?.calls ?? 0), geminiShare: share(row?.gemini ?? 0, row?.calls ?? 0),
    p95Ms: row?.p95Ms ?? null, rupees: rupeesOfRole(row?.role ?? null),
  })
  const all = recent.find((r) => r.role === null)
  return {
    today: stats(counts.find((r) => r.role === null)),
    lastQuarterHour: { calls: all?.calls ?? 0, failedShare: share(all?.failed ?? 0, all?.calls ?? 0), geminiShare: share(all?.gemini ?? 0, all?.calls ?? 0) },
    roles: counts.filter((r): r is typeof r & { role: ModelRole } => modelRoles.some((role) => role === r.role)).map((r) => ({ role: r.role, ...stats(r) })),
    bands: Object.fromEntries(scopeBands.map((band) => [band, bands.find((b) => b.band === band)?.turns ?? 0])) as Record<(typeof scopeBands)[number], number>,
  }
}

/** The AI pipeline of the admin: the switch, the spend of today, the numbers of the events, and the settings (T-65). */
export async function aiOverview(sources: AiSources): Promise<AiOverviewResponse> {
  const now = new Date()
  const startOfDay = startOfDayOf(sources.today())
  const [state, spent, calls] = await Promise.all([
    switchState(sources.db), spentOn(sources.db, sources.today()), sources.analyticsDb ? numbers(sources.analyticsDb, now, startOfDay) : null,
  ])
  return {
    switch: state,
    spend: { today: spent, dailyAmount: sources.spend.dailyRupees },
    numbers: calls,
    settings: {
      models: sources.models?.settings ?? null,
      spendAlertPercents,
      routerMinProbability: sources.assistant.routerMinProbability,
      limits: sources.limits,
    },
  }
}

/** The card of the AI pipeline on the admin home (T-65). */
export async function aiCard(sources: AiSources): Promise<AdminHomeCard> {
  const [state, spent, counts] = await Promise.all([
    switchState(sources.db), spentOn(sources.db, sources.today()),
    sources.analyticsDb ? callCounts(sources.analyticsDb, startOfDayOf(sources.today())) : null,
  ])
  const all = counts?.find((r) => r.role === null)
  return {
    subject: 'ai_pipeline', spendToday: spent, dailyAmount: sources.spend.dailyRupees, geminiOnly: state.geminiOnly,
    failedShare: counts ? share(all?.failed ?? 0, all?.calls ?? 0) : null, geminiShare: counts ? share(all?.gemini ?? 0, all?.calls ?? 0) : null,
  }
}
