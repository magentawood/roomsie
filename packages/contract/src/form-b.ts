import { z } from 'zod'
import { requiredText } from './shared'

export const observationKinds = ['constraint', 'preference', 'context', 'concern'] as const

/** One Form B note: a thing the user revealed, with their own words (PD7a). */
export const observation = z.strictObject({
  version: z.literal(1).default(1),
  /** The format only. The API checks the key against the topic catalogue. */
  key: z.string().max(60).regex(/^[a-z]+(_[a-z]+)*$/),
  value: requiredText(200),
  kind: z.enum(observationKinds),
  /** Verbatim, so no trim. T-36 checks that the quote is in the turn. */
  evidence: z.string().max(2000).refine((quote) => quote.trim() !== '', 'The quote is empty'),
  turn: z.uuid(),
  confidence: z.number().min(0).max(1),
  visible: z.boolean().default(true),
})
export type Observation = z.infer<typeof observation>
