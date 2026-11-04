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

/** What the observer reads: the typed turn and the last question of the assistant, as the router (PD7a). */
export const observerInput = z.strictObject({ version: z.literal(1).default(1), text: z.string(), lastQuestion: z.string().nullable() })
/** The answer of the observer model. Code checks the topic and the quote, and gives the confidence (T-36). Not strict, as the extractor answer. */
export const observerAnswer = z.object({
  version: z.literal(1).default(1),
  notes: z.array(observation.pick({ key: true, kind: true, value: true, evidence: true })).max(10),
})

/** What the observer gives: the notes that passed the checks, and the number of quotes that the turn does not hold. */
export const observerOutput = z.strictObject({
  version: z.literal(1).default(1),
  notes: z.array(observation.pick({ key: true, kind: true, value: true, evidence: true, confidence: true }).strict()),
  rejected: z.int().min(0),
})
export type ObserverOutput = z.output<typeof observerOutput>

/** The notes of the owner, for "What do you know about me?" (PD7a). Only the owner gets them. */
export const notesResponse = z.object({
  notes: z.array(observation.pick({ key: true, value: true, evidence: true }).extend({ id: z.uuid(), label: z.string() })),
})
export type NotesResponse = z.infer<typeof notesResponse>
