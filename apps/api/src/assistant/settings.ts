import { z } from 'zod'
import { formASlots, lifestyleAxes } from '@roomsie/contract'

const lifestyleSlots = lifestyleAxes.map((axis) => `lifestyle.${axis}` as const)
const orderItem = z.enum([...formASlots, 'lifestyle'])

/** The open product calls of the assistant are settings, not code (PC-39 of F-14). */
export const assistantSettings = z.object({
  /** Below this token probability, a value is `unclear` (PD7). T-27 keeps 0.8: docs/research/eval-2026-11.md. */
  ASSISTANT_MIN_PROBABILITY: z.coerce.number().min(0).max(1).default(0.8),
  /** Below this token probability, the band of the router is not sure, and the turn is core (T-34). Measured: docs/research/eval-2026-11-composer.md. */
  ROUTER_MIN_PROBABILITY: z.coerce.number().min(0).max(1).default(0.8),
  /** The time for all the attempts of the composer. After it, the scripted reply goes out (T-13). Measured: docs/research/eval-2026-11-composer.md. */
  COMPOSER_DEADLINE_MS: z.coerce.number().int().positive().default(3500),
  /** The time for all the attempts of the advisor. After it, the line "I've noted it" goes out (PD10). Not measured yet: the eval of T-38 measures it. */
  ADVISOR_DEADLINE_MS: z.coerce.number().int().positive().default(7000),
  /** The confidence of a note with no token probabilities: of Gemini, or of DeepSeek whose tokens do not hold the topic (T-36). At the floor of PD3a, the matching does not use it. */
  OBSERVER_UNSCORED_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.5),
  /** The notes of a sensitive turn: none, hidden notes that the matching does not use, or usual notes (PC-17). */
  OBSERVER_SENSITIVE_NOTES: z.enum(['none', 'hidden', 'visible']).default('none'),
  /** The order of the questions. `lifestyle` is the eight lifestyle questions in seed order. */
  ASSISTANT_QUESTION_ORDER: z.string().default('intent,areas,budget,moveDate,lifestyle')
    .transform((s) => s.split(',').map((item) => item.trim()))
    .pipe(z.array(orderItem).min(1)),
}).transform((s) => ({
  minProbability: s.ASSISTANT_MIN_PROBABILITY,
  routerMinProbability: s.ROUTER_MIN_PROBABILITY,
  composerDeadlineMs: s.COMPOSER_DEADLINE_MS,
  advisorDeadlineMs: s.ADVISOR_DEADLINE_MS,
  unscoredConfidence: s.OBSERVER_UNSCORED_CONFIDENCE,
  sensitiveNotes: s.OBSERVER_SENSITIVE_NOTES,
  questionOrder: [...new Set(s.ASSISTANT_QUESTION_ORDER.flatMap((item) => (item === 'lifestyle' ? lifestyleSlots : [item])))],
}))
export type AssistantSettings = z.output<typeof assistantSettings>
