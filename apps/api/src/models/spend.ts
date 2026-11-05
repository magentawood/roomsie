import { and, eq, lt, sql } from 'drizzle-orm'
import type { FastifyBaseLogger } from 'fastify'
import type { ModelUsage } from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'
import type { Db } from '../db/client'
import { modelSpend } from '../db/schema'
import { teamAlertOf } from '../team-alert'
import type { Vendor } from './models'
import type { SpendSettings } from './settings'

/** The dollars of a million tokens of each vendor, at the highest price of docs/model-selection.md, so the estimate is high. */
const modelPrices: Record<Vendor, { in: number; cachedIn: number; out: number }> = {
  deepseek: { in: 0.3, cachedIn: 0.012, out: 1.2 },
  gemini: { in: 0.3, cachedIn: 0.3, out: 2.5 },
}
const usdToInr = 88
/** The alerts of the daily amount of PD9. */
export const spendAlertPercents = [70, 100]
/** The rupees of the usage of one call, at the high prices above. */
export function rupeesOf(vendor: Vendor, usage: ModelUsage) {
  const price = modelPrices[vendor]
  return ((usage.tokensIn - usage.cachedTokensIn) * price.in + usage.cachedTokensIn * price.cachedIn + usage.tokensOut * price.out) / 1e6 * usdToInr
}
const inRupees = (amount: number) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

/** The model spend of each day (PD9, T-21). The chat never stops for it: the team gets a Telegram alert at 70% and at 100%. */
export function spendOf({ db, settings, today, log }: { db: Db; settings: SpendSettings; today: () => string; log: FastifyBaseLogger }) {
  const pending = new Set<Promise<void>>()
  const alert = teamAlertOf(settings.telegram, log)

  async function add(vendor: Vendor, usage: ModelUsage) {
    const rupees = rupeesOf(vendor, usage)
    if (!rupees) return
    const day = today()
    const [row] = await db.insert(modelSpend).values({ day, rupees: String(rupees) })
      .onConflictDoUpdate({ target: modelSpend.day, set: { rupees: sql`${modelSpend.rupees} + excluded.rupees` } })
      .returning({ rupees: modelSpend.rupees })
    const total = Number(row!.rupees)
    for (const percent of spendAlertPercents) {
      if (total < (settings.dailyRupees * percent) / 100) break
      // Only one call of the day moves `alertedPercent` to this percent, so each alert goes one time, also from two machines.
      const [moved] = await db.update(modelSpend).set({ alertedPercent: percent }).where(and(eq(modelSpend.day, day), lt(modelSpend.alertedPercent, percent))).returning()
      if (moved) await alert(`roomsie: the model spend of today is ${inRupees(total)}, ${percent}% of the daily amount of ${inRupees(settings.dailyRupees)}.`)
    }
  }

  return {
    /** The call does not wait for it. A failure goes to the error report, never to the person. */
    record(vendor: Vendor, usage: ModelUsage) {
      const done: Promise<void> = add(vendor, usage)
        .catch((err: unknown) => reportError(err, { where: 'models.spend', log }))
        .finally(() => pending.delete(done))
      pending.add(done)
    },
    settled: async () => { await Promise.all(pending) },
  }
}
export type Spend = ReturnType<typeof spendOf>

/** The model spend of a day, in rupees (T-65). */
export const spentOn = async (db: Db, day: string) =>
  Number((await db.select({ rupees: modelSpend.rupees }).from(modelSpend).where(eq(modelSpend.day, day)))[0]?.rupees ?? 0)
