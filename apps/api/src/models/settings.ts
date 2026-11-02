import { z } from 'zod'
import { unsetIfEmpty } from '../env-values'
import { modelsOf, vendorOf } from './models'

const vendorModel = z.string().refine((name) => vendorOf(name) !== undefined, 'a model name starts with deepseek- or gemini-')

/** The models of PD7. A change of vendor is a change of these settings. Without the two keys, the API calls no model. */
export const modelSettings = z.object({
  DEEPSEEK_API_KEY: unsetIfEmpty,
  GEMINI_API_KEY: unsetIfEmpty,
  // The name selects the vendor, so a name of a third vendor fails at the start.
  MODEL_PRIMARY: vendorModel.default('deepseek-flash'),
  MODEL_FALLBACK: vendorModel.default('gemini-3.5-flash-lite'),
  MODEL_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
}).transform((s) => (s.DEEPSEEK_API_KEY && s.GEMINI_API_KEY
  ? modelsOf({ keys: { deepseek: s.DEEPSEEK_API_KEY, gemini: s.GEMINI_API_KEY }, primary: s.MODEL_PRIMARY, fallback: s.MODEL_FALLBACK, timeoutMs: s.MODEL_TIMEOUT_MS })
  : undefined))

const price = z.strictObject({ in: z.number().min(0), cachedIn: z.number().min(0), out: z.number().min(0) })
/** The dollars of a million tokens at the full price, from docs/model-selection.md. DeepSeek costs half off-peak, so the estimate is high. */
const fullPrices = { deepseek: { in: 0.3, cachedIn: 0.012, out: 1.2 }, gemini: { in: 0.3, cachedIn: 0.075, out: 2.5 } }
const json = z.string().transform((text, ctx) => {
  try {
    return JSON.parse(text) as unknown
  } catch {
    ctx.addIssue({ code: 'custom', message: 'not JSON' })
    return z.NEVER
  }
})

/** The daily amount of PD9: never a stop, only the alerts at 70% and 100% (T-21). The first values are guesses (PC-10). */
export const spendSettings = z.object({
  DAILY_SPEND_RUPEES: z.coerce.number().positive().default(500),
  MODEL_PRICES_USD: json.prefault(JSON.stringify(fullPrices)).pipe(z.strictObject({ deepseek: price, gemini: price })),
  USD_TO_INR: z.coerce.number().positive().default(88),
  // Unset: the alert is only a log line, for local work and the tests.
  TELEGRAM_BOT_TOKEN: unsetIfEmpty,
  TELEGRAM_CHAT_ID: unsetIfEmpty,
}).transform((s) => ({
  dailyRupees: s.DAILY_SPEND_RUPEES,
  prices: s.MODEL_PRICES_USD,
  usdToInr: s.USD_TO_INR,
  telegram: s.TELEGRAM_BOT_TOKEN && s.TELEGRAM_CHAT_ID ? { token: s.TELEGRAM_BOT_TOKEN, chatId: s.TELEGRAM_CHAT_ID } : null,
}))
export type SpendSettings = z.output<typeof spendSettings>
