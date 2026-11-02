import { and, eq, lt, sql } from 'drizzle-orm'
import type { FastifyBaseLogger } from 'fastify'
import type { ModelUsage } from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'
import type { Db } from '../db/client'
import { modelSpend } from '../db/schema'
import { vendorOf } from './models'
import type { SpendSettings } from './settings'

const alertPercents = [70, 100] as const
const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

/** The model spend of each day (PD9, T-21). The chat never stops for it: the team gets a Telegram alert at 70% and at 100%. */
export function spendOf({ db, settings, today, log }: { db: Db; settings: SpendSettings; today: () => string; log: FastifyBaseLogger }) {
  const pending = new Set<Promise<void>>()

  async function alert(text: string) {
    if (!settings.telegram) return log.warn({ text }, 'spend alert')
    const res = await fetch(`https://api.telegram.org/bot${settings.telegram.token}/sendMessage`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: settings.telegram.chatId, text }),
    })
    if (!res.ok) throw new Error(`Telegram answered ${res.status}`)
  }

  async function add(model: string, usage: ModelUsage) {
    // The settings let only a model name of a known vendor through.
    const price = settings.prices[vendorOf(model)!]
    const dollars = ((usage.tokensIn - usage.cachedTokensIn) * price.in + usage.cachedTokensIn * price.cachedIn + usage.tokensOut * price.out) / 1e6
    if (!dollars) return
    const day = today()
    const [row] = await db.insert(modelSpend).values({ day, rupees: String(dollars * settings.usdToInr) })
      .onConflictDoUpdate({ target: modelSpend.day, set: { rupees: sql`${modelSpend.rupees} + excluded.rupees` } })
      .returning({ rupees: modelSpend.rupees })
    const total = Number(row!.rupees)
    for (const percent of alertPercents) {
      if (total < (settings.dailyRupees * percent) / 100) break
      // Only one call of the day moves `alerted` to this percent, so each alert goes one time, also from two machines.
      const [moved] = await db.update(modelSpend).set({ alerted: percent }).where(and(eq(modelSpend.day, day), lt(modelSpend.alerted, percent))).returning()
      if (moved) await alert(`roomsie: the model spend of today is ${rupees(total)}, ${percent}% of the daily amount of ${rupees(settings.dailyRupees)}.`)
    }
  }

  return {
    /** The call does not wait for it. A failure goes to the error report, never to the person. */
    record(model: string, usage: ModelUsage) {
      const done: Promise<void> = add(model, usage)
        .catch((err: unknown) => reportError(err, { where: 'models.spend', log }))
        .finally(() => pending.delete(done))
      pending.add(done)
    },
    settled: async () => { await Promise.all(pending) },
  }
}
export type Spend = ReturnType<typeof spendOf>
