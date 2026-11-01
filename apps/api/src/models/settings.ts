import { z } from 'zod'
import { unsetIfEmpty } from '../env-values'
import { modelsOf } from './models'

/** The models of PD7. A change of vendor is a change of these settings. Without the two keys, the API calls no model. */
export const modelSettings = z.object({
  DEEPSEEK_API_KEY: unsetIfEmpty,
  GEMINI_API_KEY: unsetIfEmpty,
  MODEL_PRIMARY: z.string().min(1).default('deepseek-flash'),
  MODEL_FALLBACK: z.string().min(1).default('gemini-3.5-flash-lite'),
  MODEL_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
}).transform((s) => (s.DEEPSEEK_API_KEY && s.GEMINI_API_KEY
  ? modelsOf({ deepseekKey: s.DEEPSEEK_API_KEY, geminiKey: s.GEMINI_API_KEY, primary: s.MODEL_PRIMARY, fallback: s.MODEL_FALLBACK, timeoutMs: s.MODEL_TIMEOUT_MS })
  : undefined))
