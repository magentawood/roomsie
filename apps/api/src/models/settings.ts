import { z } from 'zod'
import { unsetIfEmpty } from '../env-values'
import type { TelegramSettings } from '../team-alert'
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


/** The daily amount of PD9: never a stop, only the alerts at 70% and 100% (T-21). The first values are guesses (PC-10). */
export const spendSettings = z.object({
  DAILY_SPEND_RUPEES: z.coerce.number().positive().default(500),
  // Unset: the alert is only a log line, for local work and the tests.
  TELEGRAM_BOT_TOKEN: unsetIfEmpty,
  TELEGRAM_CHAT_ID: unsetIfEmpty,
}).transform((s) => ({
  dailyRupees: s.DAILY_SPEND_RUPEES,
  telegram: (s.TELEGRAM_BOT_TOKEN && s.TELEGRAM_CHAT_ID ? { token: s.TELEGRAM_BOT_TOKEN, chatId: s.TELEGRAM_CHAT_ID } : null) satisfies TelegramSettings,
}))
export type SpendSettings = z.output<typeof spendSettings>
