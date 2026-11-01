import { z } from 'zod'

/** The confidence floor of a Form B note in the order of the results (PD3a). */
export const matchingSettings = z.object({
  FORM_B_CONFIDENCE_FLOOR: z.coerce.number().min(0).max(1).default(0.5),
}).transform((s) => ({ formBFloor: s.FORM_B_CONFIDENCE_FLOOR }))
export type Matching = z.output<typeof matchingSettings>
