import { z } from 'zod'
import { unsetIfEmpty } from '../env-values'
import { modelsOf } from './models'

const vendorModel = z.string().regex(/^(deepseek|gemini)-/)

/** The models of PD7. A change of vendor is a change of these settings. Without the two keys, the API calls no model. */
export const modelSettings = z.object({
  DEEPSEEK_API_KEY: unsetIfEmpty,
  GEMINI_API_KEY: unsetIfEmpty,
  // The name selects the vendor, so a name of a third vendor fails at the start.
  MODEL_PRIMARY: vendorModel.default('deepseek-flash'),
  MODEL_FALLBACK: vendorModel.default('gemini-3.5-flash-lite'),
  MODEL_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
}).transform((s) => (s.DEEPSEEK_API_KEY && s.GEMINI_API_KEY
  ? modelsOf({ deepseekKey: s.DEEPSEEK_API_KEY, geminiKey: s.GEMINI_API_KEY, primary: s.MODEL_PRIMARY, fallback: s.MODEL_FALLBACK, timeoutMs: s.MODEL_TIMEOUT_MS })
  : undefined))
