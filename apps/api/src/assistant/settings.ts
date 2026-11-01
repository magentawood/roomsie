import { z } from 'zod'
import { formASlots, lifestyleAnswers, type FormASlot } from '@roomsie/contract'

const lifestyleSlots = Object.keys(lifestyleAnswers).map((axis) => `lifestyle.${axis}` as FormASlot)
const orderItem = z.enum([...formASlots, 'lifestyle'])

/** The open product calls of the assistant are settings, not code (PC-39 of F-14). */
export const assistantSettings = z.object({
  /** Below this token probability, a value is `unclear` (PD7). T-27 tunes it. */
  ASSISTANT_MIN_PROBABILITY: z.coerce.number().min(0).max(1).default(0.8),
  /** The order of the questions. `lifestyle` is the eight lifestyle questions in seed order. */
  ASSISTANT_QUESTION_ORDER: z.string().default('intent,areas,budget,moveDate,lifestyle')
    .transform((s) => s.split(',').map((item) => item.trim()))
    .pipe(z.array(orderItem).min(1)),
}).transform((s) => ({
  minProbability: s.ASSISTANT_MIN_PROBABILITY,
  questionOrder: [...new Set(s.ASSISTANT_QUESTION_ORDER.flatMap((item) => (item === 'lifestyle' ? lifestyleSlots : [item])))],
}))
export type AssistantSettings = z.output<typeof assistantSettings>
